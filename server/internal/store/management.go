package store

import "time"
func(s *Store) Active(id string)bool{s.mu.RLock();defer s.mu.RUnlock();d,ok:=s.state.Devices[id];return ok && d.Expires>time.Now().Unix()}
func(s *Store) Device(id string)(Device,bool){s.mu.RLock();defer s.mu.RUnlock();d,ok:=s.state.Devices[id];return d,ok}
func(s *Store) Devices()[]Device{
 s.mu.RLock();defer s.mu.RUnlock();out:=[]Device{}
 for _,d:=range s.state.Devices{d.TokenHash="";out=append(out,d)};return out
}
func(s *Store) Events()[]Event{s.mu.RLock();defer s.mu.RUnlock();return append([]Event{},s.state.Audit...)}
func(s *Store) Lists(device string)[]Playlist{
 s.mu.RLock();defer s.mu.RUnlock();out:=[]Playlist{}
 for _,p:=range s.state.Playlists[device]{p.Entries=append([]string{},p.Entries...);out=append(out,p)};return out
}
func(s *Store) Prune()error{
 return s.Update(func(state *State)error{
  now:=time.Now().Unix()
  for id:=range state.Progress{if _,ok:=state.Devices[id];!ok{delete(state.Progress,id)}}
  for id:=range state.Playlists{if _,ok:=state.Devices[id];!ok{delete(state.Playlists,id)}}
  for id,d:=range state.Devices{
   if d.Expires<=now{delete(state.Devices,id);delete(state.Progress,id);delete(state.Playlists,id);continue}
   policy:=Policy(d);cutoff:=now-int64(policy.RetentionDays)*86400
   for media,p:=range state.Progress[id]{if !policy.RecordHistory || p.Updated<cutoff{delete(state.Progress[id],media)}}
  }
  events:=state.Audit[:0];for _,e:=range state.Audit{if e.At>=now-30*86400{events=append(events,e)}};state.Audit=events
  return nil
 })
}
