package api

import (
 "errors"
 "net/http"
 "strings"
 "time"
 "lumen.local/tv/internal/security"
 "lumen.local/tv/internal/store"
)
var errSessionRevoked=errors.New("session revoked")
var errVersionConflict=errors.New("playlist changed since it was loaded")
func(s *Server) playlistRoutes(mux *http.ServeMux){
 mux.HandleFunc("GET /api/playlists",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){reply(w,200,s.Store.Lists(d.ID))}))
 mux.HandleFunc("PUT /api/playlists",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){
  var input struct{ID string `json:"id"`;Name string `json:"name"`;Entries []string `json:"entries"`;Version int `json:"version"`}
  if body(w,r,&input)!=nil || len(strings.TrimSpace(input.Name))<1 || len(input.Name)>100 || len(input.Entries)>100 || input.Version<0 || len(input.ID)>64{failure(w,400,"invalid playlist");return}
  for _,id:=range input.Entries{e,ok:=s.Catalog.Get(id);if !ok || (e.Kind!="audio" && e.Kind!="video"){failure(w,400,"playlist contains unavailable media");return}}
  if input.ID==""{value,err:=security.Token();if err!=nil{failure(w,503,"entropy unavailable");return};input.ID=store.Hash(value)[:24]}
  var result store.Playlist
  err:=s.Store.Update(func(state *store.State)error{
   if _,ok:=state.Devices[d.ID];!ok{return errSessionRevoked}
   if state.Playlists[d.ID]==nil{state.Playlists[d.ID]=map[string]store.Playlist{}}
   lists:=state.Playlists[d.ID];existing,exists:=lists[input.ID]
   if existing.Version!=input.Version{return errVersionConflict}
   if !exists && len(lists)>=50{return errors.New("playlist capacity reached")}
   result=store.Playlist{ID:input.ID,Name:strings.TrimSpace(input.Name),Entries:append([]string{},input.Entries...),Version:input.Version+1,Updated:time.Now().Unix()};lists[input.ID]=result
   state.Record("playlist.saved",d.ID);return nil
  })
  if errors.Is(err,errVersionConflict){failure(w,409,err.Error());return};if err!=nil{failure(w,503,"playlist could not be saved");return};reply(w,200,result)
 }))
 mux.HandleFunc("DELETE /api/playlists/{id}",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){
  if err:=s.Store.Update(func(state *store.State)error{delete(state.Playlists[d.ID],r.PathValue("id"));state.Record("playlist.deleted",d.ID);return nil});err!=nil{failure(w,503,"playlist deletion failed");return};w.WriteHeader(204)
 }))
}
