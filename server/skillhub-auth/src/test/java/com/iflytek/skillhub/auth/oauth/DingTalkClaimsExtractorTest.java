package com.iflytek.skillhub.auth.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

class DingTalkClaimsExtractorTest {

    private final DingTalkClaimsExtractor extractor = new DingTalkClaimsExtractor();

    @Test
    void extract_prefersUnionIdAndNick() {
        OAuthClaims claims = extractor.extract(
                userRequest(),
                new DefaultOAuth2User(
                        java.util.List.of(),
                        Map.of(
                                "unionId", "union-1",
                                "openId", "open-1",
                                "nick", "张三",
                                "email", "zhangsan@example.com",
                                "avatarUrl", "https://example.com/a.png"
                        ),
                        "unionId"
                )
        );

        assertThat(claims.provider()).isEqualTo("dingtalk");
        assertThat(claims.subject()).isEqualTo("union-1");
        assertThat(claims.providerLogin()).isEqualTo("张三");
        assertThat(claims.email()).isEqualTo("zhangsan@example.com");
        assertThat(claims.emailVerified()).isTrue();
    }

    @Test
    void extract_fallsBackToOpenIdWhenUnionIdMissing() {
        OAuthClaims claims = extractor.extract(
                userRequest(),
                new DefaultOAuth2User(
                        java.util.List.of(),
                        Map.of(
                                "openId", "open-2",
                                "nick", "李四"
                        ),
                        "openId"
                )
        );

        assertThat(claims.subject()).isEqualTo("open-2");
        assertThat(claims.providerLogin()).isEqualTo("李四");
        assertThat(claims.email()).isNull();
        assertThat(claims.emailVerified()).isFalse();
    }

    private static OAuth2UserRequest userRequest() {
        ClientRegistration registration = ClientRegistration.withRegistrationId("dingtalk")
                .clientId("ding-app")
                .clientSecret("secret")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri("https://login.dingtalk.com/oauth2/auth")
                .tokenUri("https://api.dingtalk.com/v1.0/oauth2/userAccessToken")
                .userInfoUri("https://api.dingtalk.com/v1.0/contact/users/me")
                .userNameAttributeName("unionId")
                .build();
        return new OAuth2UserRequest(
                registration,
                new OAuth2AccessToken(
                        OAuth2AccessToken.TokenType.BEARER,
                        "token-123",
                        Instant.now(),
                        Instant.now().plusSeconds(3600)
                )
        );
    }
}
