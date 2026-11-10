import { Badge, Stack, TextInput } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { type Board, type Property } from '../common/messages.ts';
import { ChannelSelect } from './ChannelSelect.tsx';
import { ColorOrderSelect } from './ColorOrderSelect.tsx';
import { IdentifyButton } from './IdentifyButton.tsx';
import { LevelSlider } from './LevelSlider.tsx';
import { NicknameField } from './NicknameField.tsx';
import { NumberField } from './NumberField.tsx';
import { limitsAtom, onlineAtom } from './state.ts';

// What a row says while the board honors its property
function describeHonored(property: Property): string | undefined {
  switch (property) {
    case 'currentLimit':
      return "The continuous rating of what feeds the strip, in mA: the USB connector or cable, or the strip's own supply. Brightness is scaled down on any frame that would draw more.";
    default:
      return undefined;
  }
}

// Why a board doesn't honor a property
function describeMissing(property: Property): string {
  switch (property) {
    case 'channel':
    case 'brightness':
      return 'Set on the board';
    case 'statusLedBrightness':
      return 'No status LED';
    default:
      return 'Not supported';
  }
}

export function BoardForm({ board }: { board: Board }) {
  const online = useAtomValue(onlineAtom);
  const { maxPixelCount, maxCurrentLimit } = useAtomValue(limitsAtom);
  const { deviceId, capabilities } = board;
  const makeRowProps = (property: Property) => ({
    deviceId,
    disabled: !online || !capabilities[property],
    description: capabilities[property]
      ? describeHonored(property)
      : describeMissing(property),
  });
  return (
    <Stack>
      {!board.answering && (
        <Badge color="gray" w="fit-content">
          Not answering
        </Badge>
      )}
      <TextInput label="Device ID" value={String(deviceId)} disabled />
      <ChannelSelect value={board.channel} {...makeRowProps('channel')} />
      <LevelSlider
        property="brightness"
        label="Brightness"
        value={board.brightness}
        {...makeRowProps('brightness')}
      />
      <NumberField
        property="pixelCount"
        label="Pixel count"
        max={maxPixelCount}
        value={board.pixelCount}
        {...makeRowProps('pixelCount')}
      />
      <NumberField
        property="currentLimit"
        label="Current limit"
        max={maxCurrentLimit}
        unit="mA"
        value={board.currentLimit}
        {...makeRowProps('currentLimit')}
      />
      <ColorOrderSelect
        value={board.colorOrder}
        {...makeRowProps('colorOrder')}
      />
      <LevelSlider
        property="statusLedBrightness"
        label="Status LED brightness"
        value={board.statusLedBrightness}
        {...makeRowProps('statusLedBrightness')}
      />
      <NicknameField value={board.nickname} {...makeRowProps('nickname')} />
      <IdentifyButton deviceId={deviceId} />
    </Stack>
  );
}
