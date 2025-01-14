import WithTooltip from '~/components/ui/Tooltip';
import { IconButton } from '~/components/ui/IconButton';
import React from 'react';

export const ExportChatButton = ({ exportChat }: { exportChat?: () => void }) => {
  return (
    <WithTooltip tooltip="Export Thread">
      <IconButton title="Export Thread" onClick={() => exportChat?.()}>
        <div className="i-ph:download-simple text-xl"></div>
      </IconButton>
    </WithTooltip>
  );
};
