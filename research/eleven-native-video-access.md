# ElevenLabs native video access check

On 2026-10-31 the configured ELEVEN_API_KEY successfully read the active account subscription as Starter. A read-only GET to /v1/flows/video returned HTTP 402, paid_plan_required, with the message: This endpoint requires a Pro plan or above. No native video generation was submitted and no plan change, top-up or purchase was performed.

The key supports speech: a new 60-second original German learning dialogue was prepared with the existing premade Lily and Roger voices. Its five twelve-second lessons follow the uploaded example's learner/correction/repetition/praise format. This is an audio preparation artifact, not a completed animated video. The uploaded 72.033-second reference was inspected as actual frame sequences; it uses warm 2D storybook scenes, two foreground characters, restrained gestures and timed speech bubbles.

Official documentation read: https://elevenlabs.io/docs/eleven-api/guides/cookbooks/image-and-video . It specifies Pro or higher and Image & Video/Flows key permissions for API generation. Starter website capabilities must not be confused with public API eligibility. A successful speech request does not prove video access.

Evidence: GitHub Actions run 41235373368 (metadata only) and completed dialogue-audio run 41237447877. Temporary access-reader workflow files were removed after the check. No credentials were printed, committed or included in artifacts.
