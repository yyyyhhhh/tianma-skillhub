package com.iflytek.skillhub.compat.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ClawHubPublishResponse(
        boolean ok,
        String skillId,
        String versionId,
        String status,
        String slug,
        String version,
        String publicationStatus
) {
    public ClawHubPublishResponse(String skillId, String versionId) {
        this(true, skillId, versionId, null, null, null, null);
    }
}
