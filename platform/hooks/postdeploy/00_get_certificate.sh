#!/usr/bin/env bash
# .platform/hooks/postdeploy/00_get_certificate.sh
sudo certbot -n -d team3-01.is404.net --nginx --agree-tos --email thejakesterh@gmail.com