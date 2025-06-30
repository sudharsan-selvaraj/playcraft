import React, { useState } from 'react';
import { Button, Checkbox, Modal, Stack } from '@mantine/core';
import { useSettings } from './SettingsContext';

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ opened, onClose }) => {
  const { settings, setSettings } = useSettings();
  const [allowIframeSandboxing, setAllowIframeSandboxing] = useState(
    settings.allowIframeSandboxing
  );

  const handleSave = () => {
    setSettings({ allowIframeSandboxing });
    onClose();
  };

  React.useEffect(() => {
    setAllowIframeSandboxing(settings.allowIframeSandboxing);
  }, [settings]);

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" centered>
      <Stack>
        <Checkbox
          label="Allow iframe sandboxing"
          checked={allowIframeSandboxing}
          onChange={(e) => setAllowIframeSandboxing(e.currentTarget.checked)}
        />
        <Button onClick={handleSave} mt="md" fullWidth>
          Save
        </Button>
      </Stack>
    </Modal>
  );
};
