package com.iflytek.skillhub.auth.oauth;

import org.springframework.security.oauth2.client.endpoint.DefaultAuthorizationCodeTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2AccessTokenResponse;
import org.springframework.stereotype.Component;

/**
 * Routes authorization-code token exchange to a provider-specific client when needed.
 */
@Component
public class DelegatingOAuth2AccessTokenResponseClient
        implements OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> {

    private final DingTalkOAuth2AccessTokenResponseClient dingTalkClient;
    private final OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> defaultClient =
            new DefaultAuthorizationCodeTokenResponseClient();

    public DelegatingOAuth2AccessTokenResponseClient(DingTalkOAuth2AccessTokenResponseClient dingTalkClient) {
        this.dingTalkClient = dingTalkClient;
    }

    @Override
    public OAuth2AccessTokenResponse getTokenResponse(OAuth2AuthorizationCodeGrantRequest authorizationGrantRequest) {
        String registrationId = authorizationGrantRequest.getClientRegistration().getRegistrationId();
        if (DingTalkOAuth2AccessTokenResponseClient.REGISTRATION_ID.equals(registrationId)) {
            return dingTalkClient.getTokenResponse(authorizationGrantRequest);
        }
        return defaultClient.getTokenResponse(authorizationGrantRequest);
    }
}
