import React from 'react';
import { useNode } from '@craftjs/core';
import { getToken } from '@/utils/tokens.js';

function Block({ children, style }) {
  const {
    connectors: { connect, drag },
  } = useNode();
  return (
    <div ref={(ref) => connect(drag(ref))} style={{ padding: '4px', margin: '2px', border: '1px dashed #ccc', ...style }}>
      {children}
    </div>
  );
}

export const Grid = ({ children }) => <Block style={{ display: 'grid', gap: 4 }}>{children}</Block>;
Grid.craft = { displayName: 'Grid' };

export const Stack = ({ children }) => <Block style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</Block>;
Stack.craft = { displayName: 'Stack' };

export const Tabs = ({ children }) => <Block>{children}</Block>;
Tabs.craft = { displayName: 'Tabs' };

export const TicketList = ({ children }) => <Block>{children}</Block>;
TicketList.craft = { displayName: 'TicketList' };

export const Filters = ({ children }) => <Block>{children}</Block>;
Filters.craft = { displayName: 'Filters' };

function TokenText({ text }) {
  const [value, setValue] = React.useState(text);
  React.useEffect(() => {
    const match = typeof text === 'string' && text.match(/{{(.*?)}}/);
    if (match) {
      getToken(match[1]).then((v) => setValue(text.replace(match[0], v || '')));
    } else {
      setValue(text);
    }
  }, [text]);
  return <>{value}</>;
}

export const Header = ({ text = 'Header', children }) => (
  <Block>
    <TokenText text={text} />
    {children}
  </Block>
);
Header.craft = { props: { text: 'Header' }, displayName: 'Header' };

export const Footer = ({ text = 'Footer', children }) => (
  <Block>
    <TokenText text={text} />
    {children}
  </Block>
);
Footer.craft = { props: { text: 'Footer' }, displayName: 'Footer' };

export const AllDayAggregate = ({ children }) => <Block>{children}</Block>;
AllDayAggregate.craft = { displayName: 'AllDayAggregate' };

export const AllDayFilter = ({ children }) => <Block>{children}</Block>;
AllDayFilter.craft = { displayName: 'AllDayFilter' };
