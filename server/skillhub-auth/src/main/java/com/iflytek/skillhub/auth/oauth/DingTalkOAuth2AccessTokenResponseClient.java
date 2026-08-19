package com.iflytek.skillhub.auth.oauth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2AuthorizationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.endpoint.OAuth2AccessTokenResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * DingTalk token endpoint adapter.
 *
 * <p>DingTalk's {@code /v1.0/oauth2/userAccessToken} accepts a JSON body with camelCase fields
 * ({@code clientId}, {@code grantType}, ...) and returns camelCase token fields
 * ({@code accessToken}, {@code expireIn}), which the default Spring OAuth2 form client cannot parse.
 */
@Component
public class DingTalkOAuth2AccessTokenResponseClient
        implements OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> {

    public static final String REGISTRATION_ID = "dingtalk";

    private final RestClient restClient;
    private final Converter<OAuth2AuthorizationCodeGrantRequest, RequestEntity<?>> requestEntityConverter;

    public DingTalkOAuth2AccessTokenResponseClient() {
        this(RestClient.builder());
    }

    DingTalkOAuth2AccessTokenResponseClient(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
        this.requestEntityConverter = request -> {
            ClientRegistration registration = request.getClientRegistration();
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("clientId", registration.getClientId());
            body.put("clientSecret", registration.getClientSecret());
            body.put("code", request.getAuthorizationExchange().getAuthorizationResponse().getCode());
            body.put("grantType", "authorization_code");
            return RequestEntity
                    .post(URI.create(registration.getProviderDetails().getTokenUri()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .body(body);
        };
    }

    @Override
    public OAuth2AccessTokenResponse getTokenResponse(OAuth2AuthorizationCodeGrantRequest authorizationGrantRequest) {
        RequestEntity<?> request = this.requestEntityConverter.convert(authorizationGrantRequest);
        ResponseEntity<DingTalkTokenResponse> response;
        try {
            response = this.restClient
                    .method(request.getMethod())
                    .uri(request.getUrl())
                    .headers(headers -> headers.addAll(request.getHeaders()))
                    .body(request.getBody())
                    .retrieve()
                    .toEntity(DingTalkTokenResponse.class);
        } catch (Exception ex) {
            throw new OAuth2AuthorizationException(
                    new OAuth2Error("invalid_token_response", "DingTalk token endpoint failed: " + ex.getMessage(), null),
                    ex
            );
        }

        DingTalkTokenResponse body = response.getBody();
        if (body == null || body.accessToken() == null || body.accessToken().isBlank()) {
            throw new OAuth2AuthorizationException(
                    new OAuth2Error("invalid_token_response", "DingTalk token response missing accessToken", null)
            );
        }

        Set<String> scopes = new LinkedHashSet<>(authorizationGrantRequest.getClientRegistration().getScopes());
        long expiresIn = body.expireIn() != null && body.expireIn() > 0 ? body.expireIn() : 7200L;

        Map<String, Object> additionalParameters = new LinkedHashMap<>();
        if (body.corpId() != null) {
            additionalParameters.put("corpId", body.corpId());
        }

        OAuth2AccessTokenResponse.Builder builder = OAuth2AccessTokenResponse
                .withToken(body.accessToken())
                .tokenType(OAuth2AccessToken.TokenType.BEARER)
                .expiresIn(expiresIn)
                .scopes(scopes)
                .additionalParameters(additionalParameters);
        if (body.refreshToken() != null && !body.refreshToken().isBlank()) {
            builder.refreshToken(body.refreshToken());
        }
        return builder.build();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DingTalkTokenResponse(
            @JsonProperty("accessToken") String accessToken,
            @JsonProperty("refreshToken") String refreshToken,
            @JsonProperty("expireIn") Long expireIn,
            @JsonProperty("corpId") String corpId
    ) {
    }
}
