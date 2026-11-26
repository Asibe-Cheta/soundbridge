import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashAgreementText, paragraphsFromSnapshot, loadAgreementTemplate, AgreementTemplateNotFoundError } from '../agreement-content';

test('hashAgreementText is deterministic', () => {
  const text = 'Clause one.\n\nClause two.';
  assert.equal(hashAgreementText(text), hashAgreementText(text));
  assert.match(hashAgreementText(text), /^[0-9a-f]{64}$/);
});

test('hashAgreementText changes if the text changes by even one character', () => {
  assert.notEqual(hashAgreementText('Clause one.'), hashAgreementText('Clause one!'));
});

test('paragraphsFromSnapshot splits on blank lines and trims', () => {
  const text = '  First paragraph.  \n\n\nSecond paragraph.\n\n';
  assert.deepEqual(paragraphsFromSnapshot(text), ['First paragraph.', 'Second paragraph.']);
});

test('loadAgreementTemplate rejects an unknown key', async () => {
  await assert.rejects(() => loadAgreementTemplate('../../etc/passwd'), AgreementTemplateNotFoundError);
});

test('loadAgreementTemplate rejects a missing template', async () => {
  await assert.rejects(() => loadAgreementTemplate('no-such-template'), AgreementTemplateNotFoundError);
});

test('loadAgreementTemplate loads the talk2dan template and hashes the trimmed text', async () => {
  const { text, documentHash } = await loadAgreementTemplate('talk2dan');
  assert.ok(text.includes('Parties'));
  assert.equal(documentHash, hashAgreementText(text));
});
