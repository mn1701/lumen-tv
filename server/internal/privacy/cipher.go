// Package privacy provides authenticated encryption for the companion's state snapshots.
package privacy

import (
 "crypto/aes"
 "crypto/cipher"
 "crypto/rand"
 "encoding/hex"
 "encoding/json"
 "errors"
)
type Codec struct{ aead cipher.AEAD }
type envelope struct{ Format string `json:"format"`; Nonce []byte `json:"nonce"`; Ciphertext []byte `json:"ciphertext"` }
const format="lumen-state-aes256gcm-v1"
func NewCodec(key string)(*Codec,error){
 c:=&Codec{};if key==""{return c,nil}
 raw,err:=hex.DecodeString(key);if err!=nil || len(raw)!=32{return nil,errors.New("LUMEN_STATE_KEY requires 64 hexadecimal characters")}
 block,err:=aes.NewCipher(raw);if err!=nil{return nil,err};c.aead,err=cipher.NewGCM(block);return c,err
}
func(c *Codec) Encode(data []byte)([]byte,error){
 if c.aead==nil{return data,nil};nonce:=make([]byte,c.aead.NonceSize());if _,err:=rand.Read(nonce);err!=nil{return nil,err}
 return json.Marshal(envelope{Format:format,Nonce:nonce,Ciphertext:c.aead.Seal(nil,nonce,data,[]byte(format))})
}
func(c *Codec) Decode(data []byte)([]byte,error){
 var header struct{Format string `json:"format"`};if err:=json.Unmarshal(data,&header);err!=nil{return nil,err}
 if header.Format==""{return data,nil} // Plaintext snapshots migrate on the next successful write when a key is configured.
 if header.Format!=format || c.aead==nil{return nil,errors.New("unsupported encrypted state or missing LUMEN_STATE_KEY")}
 var value envelope;if err:=json.Unmarshal(data,&value);err!=nil{return nil,err}
 if len(value.Nonce)!=c.aead.NonceSize(){return nil,errors.New("invalid state nonce")}
 return c.aead.Open(nil,value.Nonce,value.Ciphertext,[]byte(format))
}
