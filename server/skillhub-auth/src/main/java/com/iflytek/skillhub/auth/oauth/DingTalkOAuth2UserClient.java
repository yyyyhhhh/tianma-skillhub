package com.iflytek.skillhub.auth.oauth;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Loads the authorized DingTalk user profile.
 *
 * <p>DingTalk expects the access token in {@code x-acs-dingtalk-access-token} instead of a Bearer
 * Authorization header, so Spring's {@code DefaultOAuth2UserService} cannot be used directly.
 */
@Component
public class DingTalkOAuth2UserClient {

    private final RestClient restClient;

    public DingTalkOAuth2UserClient() {
        this(RestClient.builder());
    }

    DingTalkOAuth2UserClient(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    public OAuth2User loadUser(OAuth2UserRequest request) {
        String userInfoUri = request.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUri();
        Map<String, Object> attrs;
        try {
            attrs = this.restClient.get()
                    .uri(userInfoUri)
                    .accept(MediaType.APPLICATION_JSON)
                    .header("x-acs-dingtalk-access-token", request.getAccessToken().getTokenValue())
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
        } catch (Exception ex) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_user_info_response", "DingTalk user info failed: " + ex.getMessage(), null),
                    ex
            );
        }

        if (attrs == null || attrs.isEmpty()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_user_info_response", "DingTalk user info response was empty", null)
            );
        }

        Map<String, Object> attributes = new HashMap<>(attrs);
        Object corpId = request.getAdditionalParameters().get("corpId");
        if (corpId != null) {
            attributes.put("corpId", corpId);
        }

        String nameAttribute = resolveNameAttribute(attributes);
        attributes.putIfAbsent("nameAttribute", nameAttribute);

        return new DefaultOAuth2User(
                AuthorityUtils.createAuthorityList("OAUTH2_USER"),
                attributes,
                nameAttribute
        );
    }

    private static String resolveNameAttribute(Map<String, Object> attributes) {
        for (String key : List.of("unionId", "openId", "nick")) {
            Object value = attributes.get(key);
            if (value != null && !String.valueOf(value).isBlank()) {
                return key;
            }
        }
        throw new OAuth2AuthenticationException(
                new OAuth2Error("invalid_user_info_response", "DingTalk user info missing unionId/openId/nick", null)
        );
    }
}
