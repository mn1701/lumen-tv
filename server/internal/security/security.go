package security

import (
 "crypto/hmac"
 "crypto/rand"
 "crypto/sha256"
 "encoding/base64"
 "encoding/hex"
 "errors"
 "fmt"
 "strconv"
 "sync"
 "time"
)
func Token()(string,error){value:=make([]byte,32);if _,err:=rand.Read(value);err!=nil{return "",err};return base64.RawURLEncoding.EncodeToString(value),nil}
func PairCode()(string,error){
 // Rejection sampling avoids modulo bias for six decimal digits.
 for {b:=make([]byte,4);if _,err:=rand.Read(b);err!=nil{return "",err};n:=uint32(b[0])<<24|uint32(b[1])<<16|uint32(b[2])<<8|uint32(b[3]);if n<4294000000{return fmt.Sprintf("%06d",n%1000000),nil}}
}
type Tickets struct{key []byte}
func NewTickets(encoded string)(*Tickets,error){
 key,err:=hex.DecodeString(encoded);if err!=nil || len(key)!=32{return nil,errors.New("signing key must be 64 hexadecimal characters")};return &Tickets{key:key},nil
}
func (t *Tickets) signature(id,device string,expires int64)string{
 h:=hmac.New(sha256.New,t.key);fmt.Fprintf(h,"lumen-media-v1\n%s\n%s\n%d",id,device,expires);return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}
func (t *Tickets) Sign(id,device string)(int64,string){expires:=time.Now().Add(5*time.Minute).Unix();return expires,t.signature(id,device,expires)}
func (t *Tickets) Verify(id,device,expiry,signature string)bool{
 expires,err:=strconv.ParseInt(expiry,10,64);now:=time.Now().Unix()
 if err!=nil || expires<now || expires>now+301{return false}
 return hmac.Equal([]byte(signature),[]byte(t.signature(id,device,expires)))
}
type attempt struct{count int;until time.Time}
type PairLimiter struct{mu sync.Mutex;attempts map[string]attempt}
func (l *PairLimiter) Allow(address string)bool{
 l.mu.Lock();defer l.mu.Unlock();if l.attempts==nil{l.attempts=map[string]attempt{}}
 now:=time.Now();for key,a:=range l.attempts{if now.After(a.until){delete(l.attempts,key)}}
 a,exists:=l.attempts[address];if !exists{if len(l.attempts)>=1024{return false};a=attempt{until:now.Add(time.Minute)}}
 if a.count>=5{return false};a.count++;l.attempts[address]=a;return true
}
