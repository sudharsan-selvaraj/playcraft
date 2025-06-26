import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconDeviceDesktop, IconReload } from '@tabler/icons-react';
import { ActionIcon, Button, Group, Menu, Modal, NumberInput, rem, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

const DEVICES = [
  { name: 'Responsive', width: '100%', height: '100%' },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone XR', width: 414, height: 896 },
  { name: 'iPhone 12 Pro', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'Pixel 7', width: 412, height: 915 },
  { name: 'Samsung Galaxy S8+', width: 360, height: 740 },
  { name: 'Samsung Galaxy S20 Ultra', width: 412, height: 915 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Air', width: 820, height: 1180 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'Surface Pro 7', width: 912, height: 1368 },
  { name: 'Surface Duo', width: 540, height: 720 },
  { name: 'Galaxy Z Fold 5', width: 653, height: 841 },
  { name: 'Asus Zenbook Fold', width: 1280, height: 1800 },
  { name: 'Samsung Galaxy A51/71', width: 412, height: 915 },
  { name: 'Nest Hub', width: 1024, height: 600 },
  { name: 'Nest Hub Max', width: 1280, height: 800 },
  { name: 'MacBook Pro 16"', width: 1536, height: 960 },
  { name: 'UltraWide Monitor', width: 2560, height: 1080 },
  { name: 'Custom...', width: null, height: null },
];

export function AutomationFrame() {
  const [url, setUrl] = useState('https://www.example.com');
  const [inputUrl, setInputUrl] = useState(url);
  const [history, setHistory] = useState([url]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState(DEVICES[0]);
  const [customWidth, setCustomWidth] = useState(375);
  const [customHeight, setCustomHeight] = useState(667);
  const [customOpen, { open: openCustom, close: closeCustom }] = useDisclosure(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [responsiveSize, setResponsiveSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const goToUrl = (newUrl: string) => {
    setUrl(newUrl);
    const newHistory = history.slice(0, historyIndex + 1).concat(newUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setUrl(history[historyIndex - 1]);
      setInputUrl(history[historyIndex - 1]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setUrl(history[historyIndex + 1]);
      setInputUrl(history[historyIndex + 1]);
    }
  };

  const refresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputUrl(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let formattedUrl = inputUrl;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      goToUrl(formattedUrl);
    }
  };

  const isResponsive = device.name === 'Responsive';
  const iframeWidth = isResponsive
    ? responsiveSize.width
    : device.width === '100%' || device.width == null
      ? '100%'
      : device.width;
  const iframeHeight = isResponsive
    ? responsiveSize.height
    : device.height === '100%' || device.height == null
      ? '100%'
      : device.height;
  const deviceWidth = isResponsive
    ? responsiveSize.width
    : device.width && device.width !== '100%'
      ? Number(device.width)
      : undefined;
  const deviceHeight = isResponsive
    ? responsiveSize.height
    : device.height && device.height !== '100%'
      ? Number(device.height)
      : undefined;

  // Calculate scale when device or container size changes
  useLayoutEffect(() => {
    function recalcScale() {
      if (!containerRef.current) return;
      const parentWidth = containerRef.current.offsetWidth;
      const parentHeight = containerRef.current.offsetHeight;
      const w = typeof iframeWidth === 'number' ? iframeWidth : Number(iframeWidth);
      const h = typeof iframeHeight === 'number' ? iframeHeight : Number(iframeHeight);
      if (!w || !h || isNaN(w) || isNaN(h)) {
        setScale(1);
        return;
      }
      const scaleW = parentWidth / w;
      const scaleH = parentHeight / h;
      setScale(Math.min(scaleW, scaleH, 1));
    }
    recalcScale();
    // Listen for container resize
    const ro = new window.ResizeObserver(recalcScale);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    return () => {
      ro.disconnect();
    };
  }, [device, customWidth, customHeight, iframeWidth, iframeHeight]);

  // Update responsive size on window resize
  useEffect(() => {
    function handleResize() {
      setResponsiveSize({ width: window.innerWidth, height: window.innerHeight });
    }
    if (device.name === 'Responsive') {
      window.addEventListener('resize', handleResize);
      handleResize();
    }
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [device]);

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        background: '#fff', // soft yellow-white gradient
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        padding: 10, // more breathing room
      }}
    >
      {/* Browser header - always full width */}
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto 10px auto',
          background: 'var(--mantine-color-gray-3, #e6fcf5)',
          borderRadius: 8,
          boxShadow: '0 1px 4px 0 rgba(60,60,60,0.04)',
          border: '1px solid var(--mantine-color-gray-3, #dee2e6)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 48,
          padding: '0.5rem 1rem',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Group gap={2}>
          <ActionIcon
            variant="subtle"
            onClick={goBack}
            disabled={historyIndex === 0}
            size={32}
            style={{
              borderRadius: 8,
              transition: 'background 0.15s',
              background: 'transparent',
              color:
                historyIndex === 0
                  ? 'var(--mantine-color-gray-5, #adb5bd)'
                  : 'var(--mantine-color-dark-6, #212529)',
            }}
          >
            <IconArrowLeft size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            onClick={goForward}
            disabled={historyIndex === history.length - 1}
            size={32}
            style={{
              borderRadius: 8,
              transition: 'background 0.15s',
              background: 'transparent',
              color:
                historyIndex === history.length - 1
                  ? 'var(--mantine-color-gray-5, #adb5bd)'
                  : 'var(--mantine-color-dark-6, #212529)',
            }}
          >
            <IconArrowRight size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            onClick={refresh}
            size={32}
            style={{
              borderRadius: 8,
              transition: 'background 0.15s',
              color: 'var(--mantine-color-dark-6, #212529)',
            }}
          >
            <IconReload size={18} />
          </ActionIcon>
        </Group>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={inputUrl}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Enter URL"
            style={{
              flex: 1,
              minWidth: rem(200),
              boxShadow: 'none',
              fontSize: 16,
              color: '#222',
              outline: 'none',
              background: 'transparent',
            }}
            size="md"
            radius="md"
            autoComplete="off"
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 2px #ffe066';
              e.target.style.border = '1.5px solid #ffe066';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
              e.target.style.border = '1.5px solid #d3d6db';
            }}
          />
          <Menu shadow="md" width={220}>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                size={32}
                style={{
                  marginLeft: 4,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                  color: 'var(--mantine-color-dark-6, #212529)',
                }}
              >
                <IconDeviceDesktop size={20} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {DEVICES.map((d) => (
                <Menu.Item
                  key={d.name}
                  onClick={() => {
                    if (d.name === 'Custom...') {
                      openCustom();
                    } else {
                      setDevice(d);
                    }
                  }}
                  rightSection={device.name === d.name ? '✓' : undefined}
                >
                  {d.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </div>
      </div>
      {/* Device viewport container - resizes with device */}
      <div
        ref={containerRef}
        style={{
          overflow: 'hidden',
          height: '100%',
          width: '100%',
          maxWidth: 1200,
          maxHeight: '98%',
          minWidth: 320,
          minHeight: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <iframe
          ref={iframeRef}
          src={url}
          title="Automation Frame"
          style={{
            boxShadow:
              '0 4px 32px 0 rgba(60, 60, 60, 0.10), 0 1.5px 8px 0 rgba(224, 201, 127, 0.10) inset',
            border: '1.5px solid var(--mantine-color-gray-3, #dee2e6)',
            width: iframeWidth,
            height: iframeHeight,
            background: 'var(--mantine-color-white, #fff)',
            borderRadius: 0,
            transition: 'background 0.2s',
            display: 'block',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            position: 'absolute',
            top: 0,
            marginTop: 0,
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
      <Modal opened={customOpen} onClose={closeCustom} title="Custom Resolution" centered>
        <NumberInput
          label="Width (px)"
          value={customWidth}
          onChange={(val) => setCustomWidth(Number(val))}
          min={100}
          max={3000}
          step={1}
          mb="md"
        />
        <NumberInput
          label="Height (px)"
          value={customHeight}
          onChange={(val) => setCustomHeight(Number(val))}
          min={100}
          max={3000}
          step={1}
          mb="md"
        />
        <Button
          fullWidth
          mt="md"
          onClick={() => {
            setDevice({
              name: `Custom (${customWidth}x${customHeight})`,
              width: customWidth,
              height: customHeight,
            });
            closeCustom();
          }}
        >
          Apply
        </Button>
      </Modal>
    </div>
  );
}
