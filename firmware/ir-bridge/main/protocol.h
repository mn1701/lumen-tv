#ifndef LUMEN_PROTOCOL_H
#define LUMEN_PROTOCOL_H
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#define LUMEN_FRAME_SIZE 12
#define LUMEN_SEND_NEC 1
#define LUMEN_PING 2
#define LUMEN_OK 0
#define LUMEN_UNSUPPORTED 1
#define LUMEN_CONFLICT 3
#define LUMEN_HARDWARE_ERROR 4

typedef struct { uint8_t bytes[LUMEN_FRAME_SIZE]; size_t used; } lumen_parser;
uint16_t lumen_crc(const uint8_t *bytes, size_t size);
bool lumen_accept(lumen_parser *parser, uint8_t byte, uint8_t out[LUMEN_FRAME_SIZE]);
void lumen_reply(const uint8_t request[LUMEN_FRAME_SIZE], uint8_t status, uint8_t out[LUMEN_FRAME_SIZE]);
#endif
