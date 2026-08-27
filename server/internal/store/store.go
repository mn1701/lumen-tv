// Package store maintains device sessions and resume points with serialized atomic snapshots.
package store

import (
 "crypto/sha256"
 "encoding/hex"
 "encoding/json"
 "errors"
 "os"
 "path/filepath"
 "sync"
 "time"
 "lumen.local/tv/internal/privacy"
)

type Store struct { mu sync.RWMutex; path string; state State; codec *privacy.Codec }
func Hash(value string)string {sum:=sha256.Sum256([]byte(value));return hex.EncodeToString(sum[:])}
func New(path,key string)(*Store,error){
 codec,err:=privacy.NewCodec(key);if err!=nil{return nil,err}
 s:=&Store{path:path,state:State{Version:1,Devices:map[string]Device{},Progress:map[string]map[string]Progress{},Playlists:map[string]map[string]Playlist{}},codec:codec}
 stat,err:=os.Stat(path)
 if err==nil && stat.Size()>16*1024*1024{return nil,errors.New("state exceeds 16 MiB")}
 data,err:=os.ReadFile(path)
 if errors.Is(err,os.ErrNotExist){return s,nil};if err!=nil{return nil,err}
 data,err=codec.Decode(data);if err!=nil{return nil,err}
 if err=json.Unmarshal(data,&s.state);err!=nil{return nil,err}
 if s.state.Version!=1 || s.state.Devices==nil || s.state.Progress==nil{return nil,errors.New("invalid state version or maps")}
 if s.state.Playlists==nil{s.state.Playlists=map[string]map[string]Playlist{}}
 return s,nil
}
func (s *Store) Update(change func(*State)error)error{
 s.mu.Lock();defer s.mu.Unlock()
 data,err:=json.Marshal(s.state);if err!=nil{return err}
 var next State;if err=json.Unmarshal(data,&next);err!=nil{return err}
 if err=change(&next);err!=nil{return err}
 data,err=json.MarshalIndent(next,"","  ");if err!=nil{return err}
 data,err=s.codec.Encode(data);if err!=nil{return err}
 if len(data)>16*1024*1024{return errors.New("state snapshot capacity reached")}
 dir:=filepath.Dir(s.path);if err=os.MkdirAll(dir,0700);err!=nil{return err}
 file,err:=os.CreateTemp(dir,".lumen-state-*");if err!=nil{return err}
 name:=file.Name();defer os.Remove(name)
 if _,err=file.Write(data);err!=nil{file.Close();return err}
 if err=file.Sync();err!=nil{file.Close();return err}
 if err=file.Close();err!=nil{return err}
 if err=os.Rename(name,s.path);err!=nil{return err}
 s.state=next
 // Rename is the commit point. Parent sync improves power-loss durability where supported.
 if parent,e:=os.Open(dir);e==nil{_ = parent.Sync();_ = parent.Close()}
 return nil
}
func (s *Store) Authenticate(token string)(Device,bool){
 hash:=Hash(token);s.mu.RLock();defer s.mu.RUnlock()
 for _,d:=range s.state.Devices{if d.TokenHash==hash && d.Expires>time.Now().Unix(){return d,true}}
 return Device{},false
}
func (s *Store) Resume(device string)map[string]Progress{
 s.mu.RLock();defer s.mu.RUnlock();result:=map[string]Progress{}
 policy:=Policy(s.state.Devices[device]);if !policy.RecordHistory{return result}
 cutoff:=time.Now().Add(-time.Duration(policy.RetentionDays)*24*time.Hour).Unix()
 for id,p:=range s.state.Progress[device]{if p.Updated>=cutoff{result[id]=p}};return result
}
