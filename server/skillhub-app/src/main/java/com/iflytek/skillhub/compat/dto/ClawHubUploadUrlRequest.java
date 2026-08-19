package com.iflytek.skillhub.compat.dto;

import java.util.List;

public record ClawHubUploadUrlRequest(
        String path,
        Long size,
        String sha256,
        String contentType
) {}
