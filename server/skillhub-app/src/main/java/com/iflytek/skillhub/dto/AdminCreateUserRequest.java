package com.iflytek.skillhub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for administrator-created local accounts.
 */
public record AdminCreateUserRequest(
        @NotBlank(message = "{error.badRequest}")
        @Size(max = 64, message = "{error.badRequest}")
        String username,

        @NotBlank(message = "{error.badRequest}")
        @Size(max = 128, message = "{error.badRequest}")
        String password,

        @Size(max = 255, message = "{error.badRequest}")
        String email,

        @Size(max = 64, message = "{error.badRequest}")
        String role
) {
}
