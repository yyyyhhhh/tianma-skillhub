package com.iflytek.skillhub.auth.oauth;

import java.util.Map;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

/**
 * Maps DingTalk contact profile attributes into SkillHub {@link OAuthClaims}.
 *
 * <p>Subject prefers {@code unionId} (stable across apps in the same org ecosystem), falling back to
 * {@code openId}. Email is often unavailable unless the DingTalk app has been granted mailbox
 * permissions.
 */
@Component
public class DingTalkClaimsExtractor implements OAuthClaimsExtractor {

    @Override
    public String getProvider() {
        return DingTalkOAuth2AccessTokenResponseClient.REGISTRATION_ID;
    }

    @Override
    public OAuthClaims extract(OAuth2UserRequest request, OAuth2User oAuth2User) {
        Map<String, Object> attrs = oAuth2User.getAttributes();

        String unionId = stringAttr(attrs, "unionId");
        String openId = stringAttr(attrs, "openId");
        String subject = firstNonBlank(unionId, openId);
        if (subject == null) {
            throw new IllegalStateException("DingTalk profile missing both unionId and openId");
        }

        String nick = stringAttr(attrs, "nick");
        String providerLogin = firstNonBlank(nick, openId, unionId);
        String email = stringAttr(attrs, "email");
        boolean emailVerified = email != null;

        return new OAuthClaims(
                getProvider(),
                subject,
                email,
                emailVerified,
                providerLogin,
                attrs
        );
    }

    private static String stringAttr(Map<String, Object> attrs, String key) {
        Object value = attrs.get(key);
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
