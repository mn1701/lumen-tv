#include "infrared.h"
#include <stdbool.h>
#include "driver/rmt_tx.h"
#include "driver/rmt_encoder.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static rmt_channel_handle_t channel;
static rmt_encoder_handle_t encoder;
// Static payload remains valid if a timed-out hardware transmission is still pending.
static rmt_symbol_word_t symbols[34];
static bool healthy = false;

esp_err_t infrared_initialize(int gpio) {
    rmt_tx_channel_config_t config = {
        .gpio_num = gpio,
        .clk_src = RMT_CLK_SRC_DEFAULT,
        .resolution_hz = 1000000,
        .mem_block_symbols = 64,
        .trans_queue_depth = 1,
    };
    esp_err_t error = rmt_new_tx_channel(&config, &channel);
    if (error != ESP_OK) return error;
    rmt_carrier_config_t carrier = {.frequency_hz = 38000, .duty_cycle = 0.33};
    error = rmt_apply_carrier(channel, &carrier);
    if (error != ESP_OK) return error;
    rmt_copy_encoder_config_t copy = {0};
    error = rmt_new_copy_encoder(&copy, &encoder);
    if (error != ESP_OK) return error;
    error = rmt_enable(channel);
    healthy = error == ESP_OK;
    return error;
}
esp_err_t infrared_send(uint16_t address, uint8_t command) {
    // A failed channel is latched until reset; uncertain sends are never replayed automatically.
    if (!healthy) return ESP_ERR_INVALID_STATE;
    uint32_t data = address | ((uint32_t)command << 16) | ((uint32_t)(uint8_t)~command << 24);
    symbols[0] = (rmt_symbol_word_t){.level0=1, .duration0=9000, .level1=0, .duration1=4500};
    for (unsigned bit=0; bit<32; bit++) {
        symbols[bit+1] = (rmt_symbol_word_t){.level0=1, .duration0=560, .level1=0, .duration1=(data&(1u<<bit))?1690:560};
    }
    symbols[33] = (rmt_symbol_word_t){.level0=1, .duration0=560, .level1=0, .duration1=1000};
    rmt_transmit_config_t transmit = {.loop_count=0};
    esp_err_t error = rmt_transmit(channel, encoder, symbols, sizeof(symbols), &transmit);
    if (error == ESP_OK) error = rmt_tx_wait_all_done(channel, 200);
    if (error != ESP_OK) healthy=false;
    vTaskDelay(pdMS_TO_TICKS(40));
    return error;
}
