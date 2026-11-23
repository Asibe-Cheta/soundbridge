import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCurrentQuestionNumber,
  getEffectiveTotalQuestions,
  getQ7Options,
  getQ7Variant,
  getVisibleQuestionSteps,
  isQ4Visible,
  nextStep,
  previousStep,
  validateSurveyAnswers,
  Q5_OPTIONS,
  Q7_POSITIVE_OPTIONS,
} from '../survey-notifications-schema';

test('Q4 is visible only when Q3 is Yes', () => {
  assert.equal(isQ4Visible({ q3: 'Yes' }), true);
  assert.equal(isQ4Visible({ q3: 'No' }), false);
  assert.equal(isQ4Visible({ q3: 'Not sure' }), false);
  assert.equal(isQ4Visible({}), false);
});

test('Q7 variant follows Q6: Definitely/Probably -> positive, everything else -> negative', () => {
  assert.equal(getQ7Variant({ q6: 'Definitely' }), 'positive');
  assert.equal(getQ7Variant({ q6: 'Probably' }), 'positive');
  assert.equal(getQ7Variant({ q6: 'Not sure' }), 'negative');
  assert.equal(getQ7Variant({ q6: 'Probably not' }), 'negative');
  assert.equal(getQ7Variant({ q6: 'No' }), 'negative');
  assert.equal(getQ7Variant({}), 'negative');
});

test('Q7 options match the branch', () => {
  assert.deepEqual(getQ7Options({ q6: 'Definitely' }), Q7_POSITIVE_OPTIONS);
  assert.deepEqual(getQ7Options({ q6: 'No' }), Q5_OPTIONS);
});

test('visible question steps include q4 only after Yes on q3', () => {
  assert.deepEqual(getVisibleQuestionSteps({ q3: 'Yes' }), ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']);
  assert.deepEqual(getVisibleQuestionSteps({ q3: 'No' }), ['q1', 'q2', 'q3', 'q5', 'q6', 'q7']);
});

test('nextStep/previousStep skip q4 when q3 is not Yes', () => {
  const answersNo = { q3: 'No' as const };
  assert.equal(nextStep('q3', answersNo), 'q5');
  assert.equal(previousStep('q5', answersNo), 'q3');
});

test('nextStep/previousStep include q4 when q3 is Yes', () => {
  const answersYes = { q3: 'Yes' as const };
  assert.equal(nextStep('q3', answersYes), 'q4');
  assert.equal(nextStep('q4', answersYes), 'q5');
  assert.equal(previousStep('q5', answersYes), 'q4');
});

test('intro and finish are the outer bounds', () => {
  assert.equal(previousStep('q1', {}), 'intro');
  assert.equal(nextStep('q7', {}), 'finish');
});

test('progress numbering: total is 7 before Q3 is answered, and after a Yes', () => {
  assert.equal(getEffectiveTotalQuestions({}), 7);
  assert.equal(getEffectiveTotalQuestions({ q3: 'Yes' }), 7);
  assert.equal(getCurrentQuestionNumber('q4', { q3: 'Yes' }), 4);
  assert.equal(getCurrentQuestionNumber('q5', { q3: 'Yes' }), 5);
});

test('progress numbering: total drops to 6 and renumbers when Q4 is skipped', () => {
  assert.equal(getEffectiveTotalQuestions({ q3: 'No' }), 6);
  assert.equal(getCurrentQuestionNumber('q5', { q3: 'No' }), 4);
  assert.equal(getCurrentQuestionNumber('q6', { q3: 'No' }), 5);
  assert.equal(getCurrentQuestionNumber('q7', { q3: 'No' }), 6);
});

test('validateSurveyAnswers accepts a valid full response', () => {
  const result = validateSurveyAnswers({
    q1: ['WhatsApp', 'Email'],
    q2: 'Emails',
    q3: 'Yes',
    q4: ['Too many', 'Other'],
    q4_other: 'Just too noisy',
    q5: ['A daily limit'],
    q6: 'Probably',
    q7: '2 to 3',
  });
  assert.equal(result.ok, true);
});

test('validateSurveyAnswers rejects unknown fields', () => {
  const result = validateSurveyAnswers({ q1: ['Email'], evil_field: 'x' });
  assert.equal(result.ok, false);
});

test('validateSurveyAnswers rejects invalid options', () => {
  assert.equal(validateSurveyAnswers({ q1: ['Carrier pigeon'] }).ok, false);
  assert.equal(validateSurveyAnswers({ q2: 'Telepathy' }).ok, false);
  assert.equal(validateSurveyAnswers({ q6: 'Maybe' }).ok, false);
});

test('validateSurveyAnswers rejects q7 option from the wrong branch', () => {
  // 'Not sure' is a Q5/negative-branch style option, invalid when q6 is Definitely (positive branch).
  const result = validateSurveyAnswers({ q6: 'Definitely', q7: 'Not sure' });
  assert.equal(result.ok, false);
});

test('validateSurveyAnswers accepts q7 option matching its branch', () => {
  assert.equal(validateSurveyAnswers({ q6: 'Definitely', q7: '4 to 5' }).ok, true);
  assert.equal(validateSurveyAnswers({ q6: 'No', q7: 'A daily limit' }).ok, true);
});

test('validateSurveyAnswers rejects wrong-typed values', () => {
  assert.equal(validateSurveyAnswers({ q1: 'WhatsApp' }).ok, false); // should be an array
  assert.equal(validateSurveyAnswers({ q2: ['Emails'] }).ok, false); // should be a string
  assert.equal(validateSurveyAnswers('not an object').ok, false);
  assert.equal(validateSurveyAnswers(null).ok, false);
});

test('validateSurveyAnswers caps free text at 120 characters by truncating', () => {
  const longText = 'x'.repeat(500);
  const result = validateSurveyAnswers({ q4_other: longText });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.cleaned.q4_other?.length, 120);
  }
});
