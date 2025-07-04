import React, { useState } from 'react';
import { 
  Modal, 
  Button, 
  Group, 
  Text, 
  Stack, 
  Card, 
  Divider,
  Badge,
  useComputedColorScheme
} from '@mantine/core';
import { Code, Play } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import { examples } from './examples';
import { customColors } from '../../theme';

interface ExampleLoaderProps {
  onLoadExample: (code: string) => void;
}

export function ExampleLoader({ onLoadExample }: ExampleLoaderProps) {
  const [opened, setOpened] = useState(false);
  const [selectedExample, setSelectedExample] = useState(examples[0] || null);
  const colorScheme = useComputedColorScheme('dark');

  const handleLoadExample = () => {
    if (selectedExample) {
      onLoadExample(selectedExample.code.trim());
      setOpened(false);
    }
  };

  return (
    <>
      <Button
        variant="light"
        size="sm"
        onClick={() => setOpened(true)}
        style={{
          background: customColors.secondaryBg[colorScheme],
          border: `1px solid ${customColors.border[colorScheme]}`,
          color: customColors.text[colorScheme],
        }}
      >
        Load Example
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          <Group gap="sm">
            <Code size={20} />
            <Text fw={600} size="lg">
              Example Test Cases
            </Text>
          </Group>
        }
        size="90%"
        styles={{
          content: {
            background: customColors.background[colorScheme],
          },
          header: {
            background: customColors.secondaryBg[colorScheme],
            borderBottom: `1px solid ${customColors.border[colorScheme]}`,
          },
          title: {
            color: customColors.text[colorScheme],
          },
          close: {
            color: customColors.text[colorScheme],
          },
        }}
      >
        <div style={{ display: 'flex', height: '70vh', gap: 16 }}>
          {/* Left Panel - Examples List */}
          <div style={{ 
            flex: '0 0 350px', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ 
              flex: 1, 
              overflow: 'auto',
              paddingRight: 8,
              paddingTop: 20
            }}>
              <Stack gap="lg">
                {examples.map((example, index) => (
                  <Card
                    key={index}
                    p="md"
                    style={{
                      cursor: 'pointer',
                      border: `1px solid ${
                        selectedExample === example 
                          ? customColors.primary[colorScheme] 
                          : customColors.border[colorScheme]
                      }`,
                      background: selectedExample === example 
                        ? customColors.accent.blue[colorScheme] + '20' 
                        : customColors.secondaryBg[colorScheme],
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => setSelectedExample(example)}
                  >
                    <Group justify="space-between" align="flex-start" mb="xs" mt="lg">
                      <Text fw={500} size="sm" style={{ color: customColors.text[colorScheme] }}>
                        {example.name}
                      </Text>
                      {selectedExample === example && (
                        <Badge size="xs" variant="filled" color="blue">
                          Selected
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                      {example.desciption}
                    </Text>
                  </Card>
                ))}
              </Stack>
            </div>
          </div>

          {/* Right Panel - Code Preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedExample ? (
              <>
                <Group justify="space-between" align="center" mb="md">
                  <div>
                    <Text fw={600} size="lg" style={{ color: customColors.text[colorScheme] }}>
                      {selectedExample.name}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {selectedExample.desciption}
                    </Text>
                  </div>
                  <Button
                    onClick={handleLoadExample}
                    size="sm"
                    variant="filled"
                  >
                    Load into Editor
                  </Button>
                </Group>
                
                <Divider mb="md" />
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      border: `1px solid ${customColors.border[colorScheme]}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <MonacoEditor
                      height="100%"
                      language="javascript"
                      theme={colorScheme === 'dark' ? 'vs-dark' : 'vs-light'}
                      value={selectedExample.code.trim()}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        lineNumbers: 'on',
                        wordWrap: 'on',
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: customColors.textSecondary[colorScheme],
                }}
              >
                <Text size="lg">Select an example to preview</Text>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
