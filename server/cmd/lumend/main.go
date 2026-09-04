package main

import (
 "context"
 "crypto/rand"
 "encoding/hex"
 "errors"
 "log"
 "net/http"
 "os"
 "os/signal"
 "path/filepath"
 "strings"
 "syscall"
 "time"
 "lumen.local/tv/internal/api"
 "lumen.local/tv/internal/catalog"
 "lumen.local/tv/internal/security"
 "lumen.local/tv/internal/store"
)
func env(name,fallback string)string{if value:=os.Getenv(name);value!=""{return value};return fallback}
func signingKey(path string)(string,error){
 data,err:=os.ReadFile(path);if err==nil{return strings.TrimSpace(string(data)),nil};if !errors.Is(err,os.ErrNotExist){return "",err}
 key:=make([]byte,32);if _,err=rand.Read(key);err!=nil{return "",err}
 if err=os.MkdirAll(filepath.Dir(path),0700);err!=nil{return "",err}
 // Exclusive creation prevents concurrent launches from replacing another process's key.
 f,err:=os.OpenFile(path,os.O_WRONLY|os.O_CREATE|os.O_EXCL,0600);if err!=nil{return "",err}
 value:=hex.EncodeToString(key)
 if _,err=f.WriteString(value+"\n");err!=nil{f.Close();return "",err};if err=f.Sync();err!=nil{f.Close();return "",err};err=f.Close();return value,err
}
func main(){
 data:=env("LUMEN_DATA","./data")
 library,err:=catalog.Load(env("LUMEN_CATALOG","../config/catalog.json"),env("LUMEN_MEDIA","../media"));if err!=nil{log.Fatal(err)}
 state,err:=store.New(filepath.Join(data,"state.json"),os.Getenv("LUMEN_STATE_KEY"));if err!=nil{log.Fatal(err)}
 key,err:=signingKey(filepath.Join(data,"signing.key"));if err!=nil{log.Fatal(err)}
 tickets,err:=security.NewTickets(key);if err!=nil{log.Fatal(err)}
 code,err:=security.PairCode();if err!=nil{log.Fatal(err)}
 origins:=map[string]bool{};for _,origin:=range strings.Split(env("LUMEN_ORIGINS","http://127.0.0.1:5173"),","){origins[strings.TrimSpace(origin)]=true}
 service:=&api.Server{Catalog:library,Store:state,Tickets:tickets,PairCode:code,PairUntil:time.Now().Add(10*time.Minute),Origins:origins,AdminToken:os.Getenv("LUMEN_ADMIN_TOKEN")}
 server:=&http.Server{Addr:env("LUMEN_ADDR","127.0.0.1:8090"),Handler:service.Handler(),ReadHeaderTimeout:5*time.Second,ReadTimeout:15*time.Second,IdleTimeout:60*time.Second,MaxHeaderBytes:16*1024}
 // Media writes are intentionally not given a short global timeout. Pair/API bodies remain bounded.
 ctx,stop:=signal.NotifyContext(context.Background(),syscall.SIGINT,syscall.SIGTERM);defer stop()
 if token:=os.Getenv("LUMEN_ADMIN_TOKEN");token!="" && len(token)<32{log.Fatal("LUMEN_ADMIN_TOKEN requires at least 32 characters")}
 if err=state.Prune();err!=nil{log.Fatal(err)}
 go func(){ticker:=time.NewTicker(10*time.Minute);defer ticker.Stop();for{select{case <-ctx.Done():return;case <-ticker.C:if err:=state.Prune();err!=nil{log.Print("State retention sweep failed")}}}}()
 go func(){<-ctx.Done();shutdown,cancel:=context.WithTimeout(context.Background(),5*time.Second);defer cancel();_ = server.Shutdown(shutdown)}()
 log.Printf("Lumen companion %s; pairing code %s expires in 10 minutes",server.Addr,code)
 if err=server.ListenAndServe();err!=nil && !errors.Is(err,http.ErrServerClosed){log.Fatal(err)}
}
