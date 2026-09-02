package api

import (
 "crypto/subtle"
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "math"
 "net"
 "net/http"
 "net/url"
 "strconv"
 "strings"
 "time"

 "lumen.local/tv/internal/catalog"
 "lumen.local/tv/internal/security"
 "lumen.local/tv/internal/store"
)

type Server struct{Catalog *catalog.Catalog;Store *store.Store;Tickets *security.Tickets;PairCode string;PairUntil time.Time;Origins map[string]bool;AdminToken string;streams chan struct{};limiter security.PairLimiter}
func reply(w http.ResponseWriter,status int,value any){w.Header().Set("Content-Type","application/json");w.WriteHeader(status);_ = json.NewEncoder(w).Encode(value)}
func failure(w http.ResponseWriter,status int,message string){reply(w,status,map[string]string{"error":message})}
func body(w http.ResponseWriter,r *http.Request,out any)error{
 decoder:=json.NewDecoder(http.MaxBytesReader(w,r.Body,64*1024));decoder.DisallowUnknownFields()
 if err:=decoder.Decode(out);err!=nil{return err};if err:=decoder.Decode(new(any));err!=io.EOF{return errors.New("trailing JSON")};return nil
}
func (s *Server) Handler()http.Handler{
 mux:=http.NewServeMux()
 s.streams=make(chan struct{},4)
 s.privacyRoutes(mux);s.adminRoutes(mux);s.playlistRoutes(mux)
 mux.HandleFunc("GET /health",func(w http.ResponseWriter,r *http.Request){reply(w,200,map[string]any{"status":"ok","protocol":1,"catalogSize":len(s.Catalog.Entries)})})
 mux.HandleFunc("POST /api/pair",s.pair)
 mux.HandleFunc("GET /api/catalog",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){reply(w,200,map[string]any{"version":1,"entries":s.Catalog.Public()})}))
 mux.HandleFunc("GET /api/progress",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){reply(w,200,s.Store.Resume(d.ID))}))
 mux.HandleFunc("PUT /api/progress/{id}",s.authorize(s.progress))
 mux.HandleFunc("POST /api/media/{id}/ticket",s.authorize(s.ticket))
 mux.HandleFunc("DELETE /api/session",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){
  err:=s.Store.Update(func(state *store.State)error{delete(state.Devices,d.ID);delete(state.Progress,d.ID);delete(state.Playlists,d.ID);state.Record("session.revoked",d.ID);return nil})
  if err!=nil{failure(w,503,"could not revoke session");return};w.WriteHeader(204)
 }))
 mux.HandleFunc("GET /media/{id}",s.media)
 return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("X-Content-Type-Options","nosniff");w.Header().Set("Referrer-Policy","no-referrer");w.Header().Set("Cache-Control","no-store")
  w.Header().Set("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'")
  origin:=r.Header.Get("Origin")
  if origin!=""{
   if !s.Origins[origin]{failure(w,403,"origin is not configured");return}
   w.Header().Set("Access-Control-Allow-Origin",origin);w.Header().Set("Vary","Origin")
   w.Header().Set("Access-Control-Allow-Headers","Authorization, Content-Type, Range")
   w.Header().Set("Access-Control-Allow-Methods","GET, HEAD, POST, PUT, DELETE, OPTIONS")
   w.Header().Set("Access-Control-Expose-Headers","Accept-Ranges, Content-Range, Content-Length")
  }
  if r.Method=="OPTIONS"{w.WriteHeader(204);return}
  mux.ServeHTTP(w,r)
 })
}
func (s *Server) authorize(next func(http.ResponseWriter,*http.Request,store.Device))http.HandlerFunc{
 return func(w http.ResponseWriter,r *http.Request){
  header:=r.Header.Get("Authorization")
  if !strings.HasPrefix(header,"Bearer ") || len(header)>128{failure(w,401,"pair this display first");return}
  d,ok:=s.Store.Authenticate(strings.TrimPrefix(header,"Bearer "));if !ok{failure(w,401,"session expired or revoked");return};next(w,r,d)
 }
}
func (s *Server) pair(w http.ResponseWriter,r *http.Request){
 address,_,err:=net.SplitHostPort(r.RemoteAddr);if err!=nil{address=r.RemoteAddr}
 if !s.limiter.Allow(address){failure(w,429,"too many pairing attempts; wait one minute");return}
 var input struct{Code string `json:"code"`;Name string `json:"name"`}
 if body(w,r,&input)!=nil || len(input.Code)!=6 || len(strings.TrimSpace(input.Name))<1 || len(input.Name)>80{failure(w,400,"provide a six digit code and display name");return}
 if time.Now().After(s.PairUntil) || subtle.ConstantTimeCompare([]byte(input.Code),[]byte(s.PairCode))!=1{failure(w,403,"invalid or expired pairing code");return}
 token,err:=security.Token();if err!=nil{failure(w,503,"entropy unavailable");return}
 id:=store.Hash(token)[:24]
 d:=store.Device{ID:id,Name:strings.TrimSpace(input.Name),TokenHash:store.Hash(token),Created:time.Now().Unix(),Expires:time.Now().Add(30*24*time.Hour).Unix()}
 err=s.Store.Update(func(state *store.State)error{
  for key,device:=range state.Devices{if device.Expires<time.Now().Unix(){delete(state.Devices,key);delete(state.Progress,key);delete(state.Playlists,key)}}
  if len(state.Devices)>=32{return errors.New("device capacity reached")};state.Devices[id]=d;state.Record("session.paired",id);return nil
 })
 if err!=nil{failure(w,503,"device could not be registered");return};reply(w,201,map[string]any{"token":token,"deviceId":id,"expires":d.Expires})
}
func (s *Server) progress(w http.ResponseWriter,r *http.Request,d store.Device){
 id:=r.PathValue("id");entry,ok:=s.Catalog.Get(id)
 if !ok || (entry.Kind!="video" && entry.Kind!="audio"){failure(w,404,"playable media not found");return}
 if !store.Policy(d).RecordHistory{w.WriteHeader(204);return}
 var input struct{Position float64 `json:"position"`;Duration float64 `json:"duration"`}
 if body(w,r,&input)!=nil || math.IsNaN(input.Position) || math.IsNaN(input.Duration) || math.IsInf(input.Position,0) || math.IsInf(input.Duration,0) || input.Position<0 || input.Duration<=0 || input.Duration>7*24*3600 || input.Position>input.Duration{failure(w,400,"invalid playback position or duration");return}
 err:=s.Store.Update(func(state *store.State)error{
  if _,ok:=state.Devices[d.ID];!ok{return errors.New("session revoked")}
  if state.Progress[d.ID]==nil{state.Progress[d.ID]=map[string]store.Progress{}}
  if len(state.Progress[d.ID])>=1000{if _,ok:=state.Progress[d.ID][id];!ok{return errors.New("progress capacity reached")}}
  if !store.Policy(state.Devices[d.ID]).RecordHistory{return nil}
  state.Progress[d.ID][id]=store.Progress{Position:input.Position,Duration:input.Duration,Updated:time.Now().Unix()};return nil
 })
 if err!=nil{failure(w,503,"resume point could not be saved");return};w.WriteHeader(204)
}
func (s *Server) ticket(w http.ResponseWriter,r *http.Request,d store.Device){
 id:=r.PathValue("id");entry,ok:=s.Catalog.Get(id)
 if !ok || entry.Kind=="native"{failure(w,404,"media not found");return}
 expiry,sig:=s.Tickets.Sign(id,d.ID)
 query:=url.Values{"expires":{strconv.FormatInt(expiry,10)},"device":{d.ID},"sig":{sig}}
 reply(w,200,map[string]any{"path":"/media/"+url.PathEscape(id)+"?"+query.Encode(),"expires":expiry})
}
func (s *Server) media(w http.ResponseWriter,r *http.Request){
 id:=r.PathValue("id");query:=r.URL.Query()
 if !s.Tickets.Verify(id,query.Get("device"),query.Get("expires"),query.Get("sig")){failure(w,403,"media ticket expired or invalid");return}
 if !s.Store.Active(query.Get("device")){failure(w,403,"display session revoked");return}
 select{case s.streams<-struct{}{}:defer func(){<-s.streams}();default:failure(w,503,"media stream capacity reached");return}
 // Existing open streams finish normally; each new range request rechecks revocation.
 file,entry,err:=s.Catalog.Open(id);if err!=nil{failure(w,404,"media file unavailable");return};defer file.Close()
 stat,err:=file.Stat();if err!=nil{failure(w,503,"media stat failed");return}
 w.Header().Set("Content-Type",entry.MIME);w.Header().Set("Content-Disposition",fmt.Sprintf("inline; filename=%q",id))
 w.Header().Set("Cache-Control","private, no-store")
 http.ServeContent(w,r,entry.Title,stat.ModTime(),file)
}
