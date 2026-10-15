# Infrared bridge

The optional bridge targets a classic ESP32 with ESP-IDF 5.1 APIs. It implements a single-owner UART command loop and an RMT transmitter with a 1 MHz symbol clock and a 38 kHz carrier at approximately 33 percent duty cycle. A frame contains a 9 ms leader mark, 4.5 ms leader space, 32 data bits sent least significant bit first, and a closing mark. The payload is a 16 bit extended NEC address, an 8 bit command, and its inverse. No command or address is assumed to be valid for a particular LG TV.

## Hardware

Drive an IR LED through a suitable transistor and current-limiting resistor. Do not connect a high-current emitter directly to a GPIO. Use a 3.3 V UART adapter with a shared ground for UART1 control. The default TX/RX pins are 17/16 and the IR control pin is 4. Configure different pins using `idf.py menuconfig` if the board reserves them. Flash, PSRAM, input-only pins, and strapping pins vary by module. GPIO16/17 may be unavailable on modules with external memory. UART0 remains the flashing and diagnostic path.

No wiring assembly, emitter current, carrier frequency, or target-device response has been measured. Choose the emitter circuit and protocol address for your hardware before sending control commands.

## Framing

Each request and response is twelve bytes:

| Offset | Field |
| --- | --- |
| 0–1 | Magic bytes A5 5A |
| 2 | Version 1 |
| 3 | Opcode; response sets bit 7 |
| 4–5 | Sequence, little endian |
| 6–7 | Request address, little endian; response status in byte 6 |
| 8 | Request command; zero in response |
| 9 | Reserved, must be zero |
| 10–11 | CRC16-CCITT-FALSE of bytes 0–9, big endian |

Opcode 1 transmits a single extended NEC frame; opcode 2 returns a ping response. Status 0 means completed, 1 unsupported command, 3 conflicting reuse of a cached sequence, and 4 a hardware failure. CRC failures are silently discarded. The parser uses a fixed twelve-byte buffer and scans for the next magic prefix after invalid input. It does not allocate memory from incoming lengths.

The last eight request frames and responses are cached in RAM. Repeating an identical cached sequence returns its prior response without transmitting again. Reusing that sequence for a different frame returns conflict. Cache lifetime ends at reset; exactly-once delivery across reset is not provided. On an RMT failure, the transmitter remains faulted until reset because the physical outcome can be uncertain. The host retries a timed-out frame once using the same bytes and sequence.

## Host tool

Install `tools/requirements.txt` in a Python environment, connect the separate UART1 adapter, and run:

```sh
python3 tools/irctl.py /dev/YOUR_UART1_DEVICE --ping
python3 tools/irctl.py /dev/YOUR_UART1_DEVICE --address 0x1234 --command 0x01
```

The address and command above are arbitrary protocol examples, not known LG remote codes. The tool uses 115200 baud, 8 data bits, no parity, and one stop bit. Keep console logs on UART0 so they do not corrupt control frames.

The bridge has no network stack, bootloader modification, OTA server, or connection to the companion HTTP API. Its firmware is flashed using the normal ESP-IDF workflow.

Official references: [ESP-IDF RMT](https://docs.espressif.com/projects/esp-idf/en/v5.1/esp32/api-reference/peripherals/rmt.html) and [ESP-IDF UART](https://docs.espressif.com/projects/esp-idf/en/v5.1/esp32/api-reference/peripherals/uart.html).
