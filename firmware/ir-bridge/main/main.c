#include <string.h>
#include "driver/uart.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "sdkconfig.h"
#include "infrared.h"
#include "protocol.h"

typedef struct { bool valid; uint8_t request[LUMEN_FRAME_SIZE]; uint8_t response[LUMEN_FRAME_SIZE]; } recent_command;
static recent_command recent[8];
static unsigned next_slot;
static void execute(const uint8_t *request) {
    uint8_t response[LUMEN_FRAME_SIZE];
    for (unsigned i=0;i<8;i++) {
        if (!recent[i].valid || recent[i].request[4]!=request[4] || recent[i].request[5]!=request[5]) continue;
        if (!memcmp(recent[i].request,request,10)) uart_write_bytes(UART_NUM_1,recent[i].response,LUMEN_FRAME_SIZE);
        else {lumen_reply(request,LUMEN_CONFLICT,response);uart_write_bytes(UART_NUM_1,response,LUMEN_FRAME_SIZE);}
        return;
    }
    uint8_t status=LUMEN_OK;
    if (request[3]==LUMEN_SEND_NEC) {
        uint16_t address=(uint16_t)request[6]|((uint16_t)request[7]<<8);
        if (infrared_send(address,request[8])!=ESP_OK) status=LUMEN_HARDWARE_ERROR;
    } else if (request[3]!=LUMEN_PING) status=LUMEN_UNSUPPORTED;
    lumen_reply(request,status,response);
    recent_command *slot=&recent[next_slot++%8];slot->valid=true;
    memcpy(slot->request,request,LUMEN_FRAME_SIZE);memcpy(slot->response,response,LUMEN_FRAME_SIZE);
    uart_write_bytes(UART_NUM_1,response,LUMEN_FRAME_SIZE);
}
void app_main(void) {
    uart_config_t uart={.baud_rate=115200,.data_bits=UART_DATA_8_BITS,.parity=UART_PARITY_DISABLE,.stop_bits=UART_STOP_BITS_1,.flow_ctrl=UART_HW_FLOWCTRL_DISABLE,.source_clk=UART_SCLK_DEFAULT};
    ESP_ERROR_CHECK(uart_param_config(UART_NUM_1,&uart));
    ESP_ERROR_CHECK(uart_set_pin(UART_NUM_1,CONFIG_LUMEN_UART_TX,CONFIG_LUMEN_UART_RX,UART_PIN_NO_CHANGE,UART_PIN_NO_CHANGE));
    ESP_ERROR_CHECK(uart_driver_install(UART_NUM_1,512,0,0,NULL,0));
    ESP_ERROR_CHECK(infrared_initialize(CONFIG_LUMEN_IR_GPIO));
    ESP_LOGI("lumen","IR bridge ready on UART1 at 115200 baud");
    lumen_parser parser={0};uint8_t byte,frame[LUMEN_FRAME_SIZE];
    for (;;) {
        int length=uart_read_bytes(UART_NUM_1,&byte,1,pdMS_TO_TICKS(100));
        if (length==1 && lumen_accept(&parser,byte,frame)) execute(frame);
        // UART0 remains reserved for diagnostics and firmware flashing.
    }
}
