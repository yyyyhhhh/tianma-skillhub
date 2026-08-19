package com.iflytek.skillhub.auth.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.endpoint.OAuth2AccessTokenResponse;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationExchange;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationResponse;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class DingTalkOAuth2AccessTokenResponseClientTest {

    @Test
    void getTokenResponse_parsesDingTalkJsonBody() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.dingtalk.com/v1.0/oauth2/userAccessToken"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "clientId":"ding-app",
                          "clientSecret":"secret",
                          "code":"auth-code",
                          "grantType":"authorization_code"
                        }
                        """))
                .andRespond(withSuccess("""
                        {
                          "accessToken":"access-1",
                          "refreshToken":"refresh-1",
                          "expireIn":7200,
                          "corpId":"corp-1"
                        }
                        """, MediaType.APPLICATION_JSON));

        DingTalkOAuth2AccessTokenResponseClient client = new DingTalkOAuth2AccessTokenResponseClient(builder);
        OAuth2AccessTokenResponse response = client.getTokenResponse(grantRequest());

        assertThat(response.getAccessToken().getTokenValue()).isEqualTo("access-1");
        assertThat(response.getRefreshToken()).isNotNull();
        assertThat(response.getRefreshToken().getTokenValue()).isEqualTo("refresh-1");
        assertThat(response.getAdditionalParameters()).containsEntry("corpId", "corp-1");
        server.verify();
    }

    private static OAuth2AuthorizationCodeGrantRequest grantRequest() {
        ClientRegistration registration = ClientRegistration.withRegistrationId("dingtalk")
                .clientId("ding-app")
                .clientSecret("secret")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("http://localhost:8080/login/oauth2/code/dingtalk")
                .authorizationUri("https://login.dingtalk.com/oauth2/auth")
                .tokenUri("https://api.dingtalk.com/v1.0/oauth2/userAccessToken")
                .userInfoUri("https://api.dingtalk.com/v1.0/contact/users/me")
                .userNameAttributeName("unionId")
                .scope("openid")
                .build();

        OAuth2AuthorizationRequest authorizationRequest = OAuth2AuthorizationRequest.authorizationCode()
                .clientId("ding-app")
                .authorizationUri("https://login.dingtalk.com/oauth2/auth")
                .redirectUri("http://localhost:8080/login/oauth2/code/dingtalk")
                .scopes(java.util.Set.of("openid"))
                .state("state")
                .build();
        OAuth2AuthorizationResponse authorizationResponse = OAuth2AuthorizationResponse.success("auth-code")
                .redirectUri("http://localhost:8080/login/oauth2/code/dingtalk")
                .state("state")
                .build();
        return new OAuth2AuthorizationCodeGrantRequest(
                registration,
                new OAuth2AuthorizationExchange(authorizationRequest, authorizationResponse)
        );
    }
}
