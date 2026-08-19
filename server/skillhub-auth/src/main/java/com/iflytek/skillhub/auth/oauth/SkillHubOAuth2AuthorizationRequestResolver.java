package com.iflytek.skillhub.auth.oauth;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;

/**
 * OAuth2 authorization request resolver that preserves a sanitized post-login redirect target in
 * the HTTP session and applies provider-specific authorization parameters.
 */
@Component
public class SkillHubOAuth2AuthorizationRequestResolver
        implements org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver {

    private static final String AUTHORIZATION_BASE_URI = "/oauth2/authorization";

    private final DefaultOAuth2AuthorizationRequestResolver delegate;
    private final OAuthLoginFlowService oauthLoginFlowService;

    public SkillHubOAuth2AuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository,
                                                      OAuthLoginFlowService oauthLoginFlowService) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository,
                AUTHORIZATION_BASE_URI
        );
        this.oauthLoginFlowService = oauthLoginFlowService;
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        OAuth2AuthorizationRequest authorizationRequest = delegate.resolve(request);
        oauthLoginFlowService.rememberReturnTo(request);
        return enhance(authorizationRequest, extractRegistrationId(request));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        OAuth2AuthorizationRequest authorizationRequest = delegate.resolve(request, clientRegistrationId);
        oauthLoginFlowService.rememberReturnTo(request);
        return enhance(authorizationRequest, clientRegistrationId);
    }

    private static OAuth2AuthorizationRequest enhance(OAuth2AuthorizationRequest authorizationRequest,
                                                      String registrationId) {
        if (authorizationRequest == null) {
            return null;
        }
        if (!DingTalkOAuth2AccessTokenResponseClient.REGISTRATION_ID.equals(registrationId)) {
            return authorizationRequest;
        }
        Map<String, Object> additional = new HashMap<>(authorizationRequest.getAdditionalParameters());
        additional.putIfAbsent("prompt", "consent");
        return OAuth2AuthorizationRequest.from(authorizationRequest)
                .additionalParameters(additional)
                .build();
    }

    private static String extractRegistrationId(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) {
            return null;
        }
        String marker = AUTHORIZATION_BASE_URI + "/";
        int index = uri.indexOf(marker);
        if (index < 0) {
            return null;
        }
        String remainder = uri.substring(index + marker.length());
        int slash = remainder.indexOf('/');
        return slash >= 0 ? remainder.substring(0, slash) : remainder;
    }
}
