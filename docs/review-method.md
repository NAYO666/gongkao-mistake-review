# Review Method

The current review workflow is simple and transparent. It is not a scientifically validated learning system, and it should not be described that way.

## Mistake Card

Each saved mistake is a card. The card records the original mistake and the review fields that help explain why it happened:

- `title`
- `source`
- `subject`
- `module`
- `errorTags`
- `formula`
- `summary`
- `correctAnswer`
- `wrongPath`
- `trap`
- `myAnswer`
- `images`
- review metadata

The goal is to make the mistake reviewable, not only saved.

## Error Tags

The app supports error tags such as calculation error, unclear reading, weak knowledge point, wrong path, incomplete exclusion, and similar labels. Tags may come from user input, local parsing, or AI-assisted organization.

Users should adjust tags manually if the draft is wrong.

## Review Feedback

During review, each card can be marked as:

- `wrong`: the review went poorly, so the review round is reduced or kept low;
- `shaky`: the card stays at the current review round;
- `solid`: the card advances to the next review round.

When a card receives enough solid feedback for its mistake nature, it can become `mastered`.

## Spaced Repetition Logic

The current app uses simple built-in interval lists:

- `blind`: 1, 3, 7, 14, 30 days;
- `thinking`: 2, 4, 9, 18, 35 days;
- `careless`: 3, 7, 21 days.

These intervals are practical defaults, not a proven universal algorithm.

## Mastered Status

A card is marked as `mastered` after enough `solid` reviews for its current nature. Users can manually schedule a mastered card back to today if they want to review it again.

