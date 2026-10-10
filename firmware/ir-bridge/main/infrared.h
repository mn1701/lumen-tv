#ifndef LUMEN_INFRARED_H
#define LUMEN_INFRARED_H
#include <stdint.h>
#include "esp_err.h"
esp_err_t infrared_initialize(int gpio);
esp_err_t infrared_send(uint16_t address, uint8_t command);
#endif
