# overrides to s9pk.mk must precede the include statement
TARGETS := generic-x86 generic-arm nvidia-x86 nvidia-arm
ARCHES := x86 arm

include node_modules/@start9labs/start-sdk/s9pk.mk

.PHONY += generic nvidia generic-x86 generic-arm nvidia-x86 nvidia-arm

generic: generic-x86 generic-arm
nvidia: nvidia-x86 nvidia-arm

generic-%:; $(MAKE) $*
nvidia-%:; VARIANT=nvidia $(MAKE) $*
