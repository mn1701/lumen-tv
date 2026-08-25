package store

import "time"
type Privacy struct { RecordHistory bool `json:"recordHistory"`; RetentionDays int `json:"retentionDays"` }
type Device struct { ID string `json:"id"`; Name string `json:"name"`; TokenHash string `json:"tokenHash"`; Created int64 `json:"created"`; Expires int64 `json:"expires"`; Privacy *Privacy `json:"privacy,omitempty"` }
type Progress struct { Position float64 `json:"position"`; Duration float64 `json:"duration"`; Updated int64 `json:"updated"` }
type Playlist struct { ID string `json:"id"`; Name string `json:"name"`; Entries []string `json:"entries"`; Version int `json:"version"`; Updated int64 `json:"updated"` }
type Event struct { At int64 `json:"at"`; Kind string `json:"kind"`; DeviceID string `json:"deviceId,omitempty"` }
type State struct {
 Version int `json:"version"`
 Devices map[string]Device `json:"devices"`
 Progress map[string]map[string]Progress `json:"progress"`
 Playlists map[string]map[string]Playlist `json:"playlists"`
 Audit []Event `json:"audit"`
}
func Policy(device Device)Privacy {if device.Privacy==nil{return Privacy{RecordHistory:true,RetentionDays:30}};return *device.Privacy}
func(s *State) Record(kind,device string){
 s.Audit=append(s.Audit,Event{At:time.Now().Unix(),Kind:kind,DeviceID:device})
 if len(s.Audit)>256{s.Audit=append([]Event(nil),s.Audit[len(s.Audit)-256:]...)}
}
