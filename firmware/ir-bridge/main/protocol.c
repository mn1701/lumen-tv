#include "protocol.h"
#include <string.h>
uint16_t lumen_crc(const uint8_t *bytes,size_t size) {
    uint16_t crc=0xffff;
    for (size_t i=0;i<size;i++) {
        crc^=(uint16_t)bytes[i]<<8;
        for (unsigned bit=0;bit<8;bit++) crc=(uint16_t)((crc&0x8000)?(crc<<1)^0x1021:crc<<1);
    }
    return crc;
}
bool lumen_accept(lumen_parser *p,uint8_t byte,uint8_t out[LUMEN_FRAME_SIZE]) {
    p->bytes[p->used++]=byte;
    while (p->used>=2 && (p->bytes[0]!=0xa5 || p->bytes[1]!=0x5a)) {
        memmove(p->bytes,p->bytes+1,--p->used);
    }
    if (p->used<LUMEN_FRAME_SIZE) return false;
    uint16_t crc=lumen_crc(p->bytes,10);
    bool valid=p->bytes[2]==1 && p->bytes[9]==0 && p->bytes[10]==(uint8_t)(crc>>8) && p->bytes[11]==(uint8_t)crc;
    if (valid) {memcpy(out,p->bytes,LUMEN_FRAME_SIZE);p->used=0;return true;}
    memmove(p->bytes,p->bytes+1,LUMEN_FRAME_SIZE-1);p->used=LUMEN_FRAME_SIZE-1;
    return false;
}
void lumen_reply(const uint8_t request[LUMEN_FRAME_SIZE],uint8_t status,uint8_t out[LUMEN_FRAME_SIZE]) {
    memset(out,0,LUMEN_FRAME_SIZE);out[0]=0xa5;out[1]=0x5a;out[2]=1;out[3]=request[3]|0x80;
    out[4]=request[4];out[5]=request[5];out[6]=status;
    uint16_t crc=lumen_crc(out,10);out[10]=(uint8_t)(crc>>8);out[11]=(uint8_t)crc;
}
