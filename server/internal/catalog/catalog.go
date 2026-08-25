// Package catalog validates a curated collection of local media and installed app shortcuts.
package catalog

import (
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "os"
 "path/filepath"
 "regexp"
 "strings"
)

type Entry struct {
 ID string `json:"id"`
 Title string `json:"title"`
 Kind string `json:"kind"`
 Collection string `json:"collection"`
 Description string `json:"description"`
 File string `json:"file,omitempty"`
 AppID string `json:"appId,omitempty"`
 MIME string `json:"mime,omitempty"`
 Duration float64 `json:"duration,omitempty"`
}
type Document struct { Version int `json:"version"`; Entries []Entry `json:"entries"` }
type Catalog struct { Entries []Entry; byID map[string]Entry; root string }
var identifier=regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)
var appIdentifier=regexp.MustCompile(`^[a-z0-9][a-z0-9.-]{1,127}$`)

func Load(path, root string) (*Catalog,error) {
 f,err:=os.Open(path);if err!=nil{return nil,err};defer f.Close()
 decoder:=json.NewDecoder(io.LimitReader(f,1024*1024+1));decoder.DisallowUnknownFields()
 var doc Document
 if err=decoder.Decode(&doc);err!=nil{return nil,err}
 if err=decoder.Decode(new(any));err!=io.EOF{return nil,errors.New("catalog contains trailing content")}
 if doc.Version!=1 || len(doc.Entries)>1000{return nil,errors.New("unsupported catalog version or size")}
 abs,err:=filepath.Abs(root);if err!=nil{return nil,err}
 c:=&Catalog{Entries:doc.Entries,byID:make(map[string]Entry),root:abs}
 for _,entry:=range doc.Entries {
  if !identifier.MatchString(entry.ID) || strings.TrimSpace(entry.Title)=="" || len(entry.Title)>160 || len(entry.Description)>2000{return nil,errors.New("invalid catalog identity or text")}
  if _,exists:=c.byID[entry.ID];exists{return nil,fmt.Errorf("duplicate catalog ID: %s",entry.ID)}
  switch entry.Kind {
  case "video","audio","image":
   if entry.File=="" || filepath.IsAbs(entry.File) || strings.Contains(entry.File,"\\") || entry.AppID!="" {return nil,errors.New("media entries require a relative file")}
   clean:=filepath.Clean(entry.File)
   if clean==".." || strings.HasPrefix(clean,".."+string(filepath.Separator)){return nil,errors.New("media path escapes root")}
   ext:=strings.ToLower(filepath.Ext(clean))
   allowed:=map[string]map[string]string{
    "video":{ ".mp4":"video/mp4", ".webm":"video/webm" },
    "audio":{ ".mp3":"audio/mpeg", ".m4a":"audio/mp4", ".ogg":"audio/ogg" },
    "image":{ ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp" },
   }
   mime:=allowed[entry.Kind][ext];if mime==""{return nil,fmt.Errorf("unsupported %s file extension",entry.Kind)}
   if entry.MIME!="" && entry.MIME!=mime{return nil,errors.New("MIME type conflicts with extension")}
   entry.MIME=mime
  case "native":
   if !appIdentifier.MatchString(entry.AppID) || entry.File!="" {return nil,errors.New("invalid installed app shortcut")}
  default:return nil,errors.New("unsupported catalog entry kind")
  }
  c.byID[entry.ID]=entry
 }
 // Return canonical MIME values and keep the file paths private in the API layer.
 for i,e:=range c.Entries{c.Entries[i]=c.byID[e.ID]}
 return c,nil
}
func (c *Catalog) Get(id string)(Entry,bool){e,ok:=c.byID[id];return e,ok}
func (c *Catalog) Public() []Entry {
 result:=make([]Entry,len(c.Entries));copy(result,c.Entries)
 for i:=range result{result[i].File=""};return result
}
func (c *Catalog) Open(id string)(*os.File,Entry,error){
 e,ok:=c.Get(id);if !ok || e.File==""{return nil,e,os.ErrNotExist}
 root,err:=filepath.EvalSymlinks(c.root);if err!=nil{return nil,e,err}
 path,err:=filepath.EvalSymlinks(filepath.Join(root,e.File));if err!=nil{return nil,e,err}
 rel,err:=filepath.Rel(root,path)
 if err!=nil || rel==".." || strings.HasPrefix(rel,".."+string(filepath.Separator)){return nil,e,errors.New("media symlink escapes root")}
 f,err:=os.Open(path);if err!=nil{return nil,e,err}
 st,err:=f.Stat();if err!=nil || !st.Mode().IsRegular(){f.Close();return nil,e,errors.New("media is not a regular file")}
 return f,e,nil
}
