package com.iflytek.skillhub.compat.dto;

import java.util.List;

/**
 * JSON body used by clawhub >= 0.23 publish after staged uploads.
 */
public record ClawHubJsonPublishRequest(
        String slug,
        String displayName,
        String ownerHandle,
        String sourceOwnerHandle,
        Boolean migrateOwner,
        String version,
        String changelog,
        Boolean acceptLicenseTerms,
        Boolean confirmWarnings,
        String namespace,
        String packageType,
        List<String> tags,
        List<String> categories,
        List<String> topics,
        List<UploadedFile> files
) {
    public record UploadedFile(
            String path,
            Long size,
            String storageId,
            String sha256,
            String contentType,
            String uploadTicket
    ) {}
}
