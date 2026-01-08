import { IconButton, Portal, Text } from "@chakra-ui/react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import Link from "next/link";
import React from "react";

function CustomMenu({ items }) {
  return (
    <Menu
      align="end"
      portal
      gap={5}
      menuButton={
        <IconButton
          variant="ghost"
          colorScheme="purple"
          size="xs"
          icon={<i className={`fa fa-ellipsis-v`} />}
        />
      }
      transition
    >
      {items.map((item) =>
        item.redirectionUrl ? (
          <Link key={item.label} href={item.redirectionUrl} passHref>
            <MenuItem onClick={item.onClick}>
              <Text fontSize="xs">{item.label}</Text>
            </MenuItem>
          </Link>
        ) : (
          <MenuItem key={item.label} onClick={item.onClick}>
            <Text fontSize="xs">{item.label}</Text>
          </MenuItem>
        )
      )}
    </Menu>
  );
}

export default CustomMenu;
