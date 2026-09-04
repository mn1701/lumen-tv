package api

import (
 "crypto/subtle"
 "net/http"
 "strings"
 "lumen.local/tv/internal/store"
)
func(s *Server) administrator(next http.HandlerFunc)http.HandlerFunc{
 return func(w http.ResponseWriter,r *http.Request){
  if len(s.AdminToken)<32{failure(w,404,"administration is disabled");return}
  token:=strings.TrimPrefix(r.Header.Get("Authorization"),"Bearer ")
  if subtle.ConstantTimeCompare([]byte(token),[]byte(s.AdminToken))!=1{failure(w,401,"administrator credential required");return};next(w,r)
 }
}
func(s *Server) adminRoutes(mux *http.ServeMux){
 mux.HandleFunc("GET /api/admin/devices",s.administrator(func(w http.ResponseWriter,r *http.Request){reply(w,200,s.Store.Devices())}))
 mux.HandleFunc("GET /api/admin/audit",s.administrator(func(w http.ResponseWriter,r *http.Request){reply(w,200,s.Store.Events())}))
 mux.HandleFunc("DELETE /api/admin/devices/{id}",s.administrator(func(w http.ResponseWriter,r *http.Request){
  id:=r.PathValue("id")
  if err:=s.Store.Update(func(state *store.State)error{delete(state.Devices,id);delete(state.Progress,id);delete(state.Playlists,id);state.Record("session.revoked",id);return nil});err!=nil{failure(w,503,"revocation failed");return};w.WriteHeader(204)
 }))
}
