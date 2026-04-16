resource "random_id" "suffix" {
  byte_length = 4
}

resource "random_id" "tg_suffix" {
  byte_length = 2
}

# 32 bytes -> 64 hex chars for IAC_MASTER_KEY validation in the API.
resource "random_id" "iac_master" {
  byte_length = 32
}
