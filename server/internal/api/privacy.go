package api

import (
 "net/http"
 "lumen.local/tv/internal/store"
)
func(s *Server) privacyRoutes(mux *http.ServeMux){
 mux.HandleFunc("GET /api/privacy",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){reply(w,200,store.Policy(d))}))
 mux.HandleFunc("PUT /api/privacy",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){
  var policy store.Privacy
  if body(w,r,&policy)!=nil || policy.RetentionDays<1 || policy.RetentionDays>90{failure(w,400,"retention must be 1 to 90 days");return}
  err:=s.Store.Update(func(state *store.State)error{
   current,ok:=state.Devices[d.ID];if !ok{return errSessionRevoked};current.Privacy=&policy;state.Devices[d.ID]=current
   if !policy.RecordHistory{delete(state.Progress,d.ID)};state.Record("privacy.changed",d.ID);return nil
  })
  if err!=nil{failure(w,503,"privacy update failed");return};reply(w,200,policy)
 }))
 mux.HandleFunc("DELETE /api/progress",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){
  if err:=s.Store.Update(func(state *store.State)error{delete(state.Progress,d.ID);state.Record("history.cleared",d.ID);return nil});err!=nil{failure(w,503,"history could not be erased");return};w.WriteHeader(204)
 }))
 mux.HandleFunc("GET /api/export",s.authorize(func(w http.ResponseWriter,r *http.Request,d store.Device){
  w.Header().Set("Content-Disposition","attachment; filename=\"lumen-display-export.json\"")
  // Export intentionally excludes session hashes, signing keys, and other display data.
  reply(w,200,map[string]any{"version":1,"device":map[string]any{"id":d.ID,"name":d.Name},"privacy":store.Policy(d),"progress":s.Store.Resume(d.ID),"playlists":s.Store.Lists(d.ID)})
 }))
}
