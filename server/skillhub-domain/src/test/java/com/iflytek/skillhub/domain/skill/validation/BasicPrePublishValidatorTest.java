package com.iflytek.skillhub.domain.skill.validation;

import com.iflytek.skillhub.domain.skill.metadata.SkillMetadata;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

class BasicPrePublishValidatorTest {

    private final BasicPrePublishValidator validator = new BasicPrePublishValidator();

    @Test
    void shouldWarnOnObviousCredentialLeakWithHelpfulLocation() {
        PackageEntry skillMd = new PackageEntry(
                "SKILL.md",
                """
                ---
                name: Secret Skill
                version: 1.0.0
                ---
                token=sk-abcdefghijklmnopqrstuvwxyz123456
                """.getBytes(StandardCharsets.UTF_8),
                91,
                "text/markdown"
        );

        ValidationResult result = validator.validate(new PrePublishValidator.SkillPackageContext(
                List.of(skillMd),
                new SkillMetadata("Secret Skill", "desc", "1.0.0", "body", Map.of()),
                "user-1",
                1L
        ));

        assertTrue(result.passed());
        assertTrue(result.warnings().stream().anyMatch(error ->
                error.contains("SKILL.md")
                        && error.contains("line 5")
                        && error.contains("looks like a")));
    }

    @Test
    void shouldAllowOrdinaryTextFiles() {
        PackageEntry skillMd = new PackageEntry(
                "SKILL.md",
                """
                ---
                name: Safe Skill
                version: 1.0.0
                ---
                """.getBytes(StandardCharsets.UTF_8),
                45,
                "text/markdown"
        );
        PackageEntry readme = new PackageEntry(
                "README.md",
                "This skill documents safe usage.".getBytes(StandardCharsets.UTF_8),
                31,
                "text/markdown"
        );

        ValidationResult result = validator.validate(new PrePublishValidator.SkillPackageContext(
                List.of(skillMd, readme),
                new SkillMetadata("Safe Skill", "desc", "1.0.0", "body", Map.of()),
                "user-1",
                1L
        ));

        assertTrue(result.passed());
    }

    @Test
    void shouldIgnoreObviousPlaceholderSecrets() {
        PackageEntry skillMd = new PackageEntry(
                "SKILL.md",
                """
                ---
                name: Example Skill
                version: 1.0.0
                ---
                token=YOUR_TOKEN_HERE
                api_key=example-key-value
                """.getBytes(StandardCharsets.UTF_8),
                102,
                "text/markdown"
        );

        ValidationResult result = validator.validate(new PrePublishValidator.SkillPackageContext(
                List.of(skillMd),
                new SkillMetadata("Example Skill", "desc", "1.0.0", "body", Map.of()),
                "user-1",
                1L
        ));

        assertTrue(result.passed());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void shouldNotWarnWhenCredentialsComeFromAFunctionCall() {
        PackageEntry script = new PackageEntry(
                "scripts/xfei_hyper_tts.py",
                """
                def speak():
                    app_id, api_key, api_secret = get_env_credentials()
                    api_key = os.getenv("XFYUN_API_KEY")
                """.getBytes(StandardCharsets.UTF_8),
                140,
                "text/x-python"
        );

        ValidationResult result = validator.validate(new PrePublishValidator.SkillPackageContext(
                List.of(script),
                new SkillMetadata("TTS", "desc", "1.0.0", "body", Map.of()),
                "user-1",
                1L
        ));

        assertTrue(result.passed());
        assertTrue(result.warnings().isEmpty(), () -> String.join("\n", result.warnings()));
    }

    @Test
    void shouldStillWarnOnQuotedLiteralSecrets() {
        PackageEntry script = new PackageEntry(
                "scripts/client.py",
                "api_secret = \"wxyzabcd1234leak\"\n".getBytes(StandardCharsets.UTF_8),
                32,
                "text/x-python"
        );

        ValidationResult result = validator.validate(new PrePublishValidator.SkillPackageContext(
                List.of(script),
                new SkillMetadata("TTS", "desc", "1.0.0", "body", Map.of()),
                "user-1",
                1L
        ));

        assertTrue(result.passed());
        assertTrue(result.warnings().stream().anyMatch(warning ->
                warning.contains("scripts/client.py") && warning.contains("line 1")));
    }
}
