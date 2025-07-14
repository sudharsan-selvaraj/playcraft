import React, { useEffect, useState } from 'react';
import { Modal, Select, TextInput, Button } from '@mantine/core';

export type AssertionCandidate = {
  locator: string;
  text: string;
  tagName: string;
  attributes: Record<string, string>;
};

export type AssertionModalProps = {
  opened: boolean;
  onClose: () => void;
  candidate: AssertionCandidate | null;
  onAddAssertion: (code: string, description: string) => void;
};

export function AssertionModal({ opened, onClose, candidate, onAddAssertion }: AssertionModalProps) {
  const [assertionType, setAssertionType] = useState('text');
  const [assertionText, setAssertionText] = useState('');
  const [assertionAttribute, setAssertionAttribute] = useState('');
  const [assertionAttributeValue, setAssertionAttributeValue] = useState('');
  const [assertionAttributes, setAssertionAttributes] = useState<Record<string, string>>({});

  // Reset state when candidate changes or modal opens
  useEffect(() => {
    if (candidate) {
      setAssertionType('text');
      setAssertionText(candidate.text || '');
      setAssertionAttributes(candidate.attributes || {});
      setAssertionAttribute('');
      setAssertionAttributeValue('');
    }
  }, [candidate, opened]);

  // Prefill attribute and value when switching to attribute type
  useEffect(() => {
    if (assertionType === 'attribute') {
      const keys = Object.keys(assertionAttributes);
      setAssertionAttribute(keys[0] || '');
      setAssertionAttributeValue(keys[0] ? assertionAttributes[keys[0]] : '');
    }
  }, [assertionType, assertionAttributes]);

  const handleTypeChange = (value: string | null) => {
    setAssertionType(value || '');
    if (value === 'attribute') {
      const keys = Object.keys(assertionAttributes);
      setAssertionAttribute(keys[0] || '');
      setAssertionAttributeValue(keys[0] ? assertionAttributes[keys[0]] : '');
    }
  };

  const handleAttributeChange = (value: string | null) => {
    setAssertionAttribute(value || '');
    setAssertionAttributeValue(value && assertionAttributes[value] ? assertionAttributes[value] : '');
  };

  const handleAdd = () => {
    if (!candidate) return;
    let code = '';
    let description = '';
    let locator = candidate.locator;
    if (!locator.trim().startsWith('page.')) {
      locator = 'page.' + locator;
    }
    if (assertionType === 'text') {
      code = `await expect(${locator}).toHaveText('${assertionText.replace(/'/g, "\\'")}');`;
      description = `assert text is "${assertionText}"`;
    } else if (assertionType === 'visible') {
      code = `await expect(${locator}).toBeVisible();`;
      description = `assert visible`;
    } else if (assertionType === 'hidden') {
      code = `await expect(${locator}).toBeHidden();`;
      description = `assert hidden`;
    } else if (assertionType === 'attribute') {
      code = `await expect(${locator}).toHaveAttribute('${assertionAttribute}', '${assertionAttributeValue.replace(/'/g, "\\'")}');`;
      description = `assert attribute ${assertionAttribute} is "${assertionAttributeValue}"`;
    }
    onAddAssertion(code, description);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Assertion" centered>
      {candidate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <b>Element:</b> <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{candidate.locator}</span>
          </div>
          <Select
            label="Assertion Type"
            value={assertionType}
            onChange={handleTypeChange}
            data={[
              { value: 'text', label: 'Text' },
              { value: 'visible', label: 'Visible' },
              { value: 'hidden', label: 'Hidden' },
              { value: 'attribute', label: 'Attribute' },
            ]}
          />
          {assertionType === 'text' && (
            <TextInput
              label="Text to Assert"
              value={assertionText}
              onChange={(e) => setAssertionText(e.currentTarget.value)}
            />
          )}
          {assertionType === 'attribute' && (
            <>
              <Select
                label="Attribute"
                value={assertionAttribute}
                onChange={handleAttributeChange}
                data={Object.keys(assertionAttributes).map((k) => ({ value: k, label: k }))}
              />
              <TextInput
                label="Attribute Value"
                value={assertionAttributeValue}
                onChange={(e) => setAssertionAttributeValue(e.currentTarget.value)}
              />
            </>
          )}
          <Button onClick={handleAdd} disabled={assertionType === 'attribute' && !assertionAttribute}>
            Add Assertion
          </Button>
        </div>
      )}
    </Modal>
  );
} 