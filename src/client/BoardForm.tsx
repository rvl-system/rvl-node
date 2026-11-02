import { Badge, Stack, TextInput } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { type Board, type Property } from '../common/messages.ts';
import { ChannelSelect } from './ChannelSelect.tsx';
import { ColorOrderSelect } from './ColorOrderSelect.tsx';
import { IdentifyButton } from './IdentifyButton.tsx';
import { LevelSlider } from './LevelSlider.tsx';
import { NicknameField } from './NicknameField.tsx';
import { PixelCountField } from './PixelCountField.tsx';
import { onlineAtom } from './state.ts';

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
  const { deviceId, capabilities } = board;
  const makeRowProps = (property: Property) => ({
    deviceId,
    disabled: !online || !capabilities[property],
    description: capabilities[property] ? undefined : describeMissing(property),
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
      <PixelCountField
        value={board.pixelCount}
        {...makeRowProps('pixelCount')}
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
