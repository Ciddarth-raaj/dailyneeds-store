import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Select,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
} from "@chakra-ui/react";

import CustomContainer from "../CustomContainer";
import ActivityLog from "./ActivityLog";
import Checklist from "./Checklist";
import CommentThread from "./CommentThread";
import {
  ChecklistChip,
  DueChip,
  MetaLine,
  PriorityChip,
  StatusChip,
  TypeChip,
} from "./Chips";
import {
  STATUS_LIST,
  formatDate,
  formatDateTime,
  isVideoUrl,
  itemTypeMeta,
} from "../../constants/workItems";

/**
 * The read view of a work item — a real detail page rather than a form with
 * every field disabled. Photos are shown as photos, and the one action people
 * come here to take (move the status) is available without opening the editor.
 */
function WorkItemDetail({
  ticket,
  currentEmployeeId,
  canEdit,
  canTick,
  canModerate,
  onStatusChange,
  statusSaving,
  onRefetch,
  onEdit,
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [preview, setPreview] = useState(null);

  const type = itemTypeMeta(ticket.item_type);
  const images = ticket.images || [];
  const checklist = ticket.checklist || [];

  const openPreview = (url) => {
    setPreview(url);
    onOpen();
  };

  return (
    <Flex direction="column" gap="16px">
      <CustomContainer
        title={`${type.label} #${ticket.id}`}
        filledHeader
        colorScheme={type.colorScheme}
        rightSection={
          canEdit ? (
            <Button size="sm" colorScheme="purple" variant="outline" onClick={onEdit}>
              Edit
            </Button>
          ) : null
        }
      >
        <Text fontSize="lg" fontWeight="600" color="gray.800" mb="10px">
          {ticket.title}
        </Text>

        <Flex gap="6px" flexWrap="wrap" mb="16px">
          <TypeChip itemType={ticket.item_type} />
          <StatusChip status={ticket.status} />
          <PriorityChip priority={ticket.priority} />
          <DueChip dueDate={ticket.due_date} status={ticket.status} />
          <ChecklistChip
            done={checklist.filter((item) => item.is_done).length}
            total={checklist.length}
          />
        </Flex>

        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing="10px" mb="16px">
          <MetaLine label="Branch">{ticket.outlet_name}</MetaLine>
          <MetaLine label="Department">{ticket.department_name}</MetaLine>
          <MetaLine label="Assigned to">{ticket.assigned_to_name}</MetaLine>
          <MetaLine label="Raised by">{ticket.created_by_name}</MetaLine>
          <MetaLine label="Created">{formatDateTime(ticket.created_at)}</MetaLine>
          <MetaLine label="Due">
            {ticket.due_date ? formatDate(ticket.due_date) : null}
          </MetaLine>
          {ticket.closed_at ? (
            <MetaLine label="Closed">{formatDateTime(ticket.closed_at)}</MetaLine>
          ) : null}
        </SimpleGrid>

        {ticket.description ? (
          <Box mb="16px">
            <Text fontSize="xs" color="gray.500" mb="4px">
              Description
            </Text>
            <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap">
              {ticket.description}
            </Text>
          </Box>
        ) : null}

        {images.length > 0 && (
          <Box mb="16px">
            <Text fontSize="xs" color="gray.500" mb="6px">
              Attachments ({images.length})
            </Text>
            <SimpleGrid columns={{ base: 3, sm: 4, md: 6 }} spacing="8px">
              {images.map((image) => (
                <Box
                  key={image.image_id}
                  as="button"
                  type="button"
                  borderRadius="8px"
                  overflow="hidden"
                  borderWidth="1px"
                  borderColor="gray.200"
                  onClick={() => openPreview(image.s3_url)}
                  _focusVisible={{ outline: "2px solid", outlineColor: "purple.400" }}
                >
                  {isVideoUrl(image.s3_url) ? (
                    <Box position="relative" height="84px" bg="gray.900">
                      <Box
                        as="video"
                        src={image.s3_url}
                        width="100%"
                        height="84px"
                        objectFit="cover"
                        muted
                        preload="metadata"
                      />
                      <Flex
                        position="absolute"
                        inset="0"
                        align="center"
                        justify="center"
                        color="white"
                        fontSize="20px"
                        textShadow="0 1px 4px rgba(0,0,0,0.6)"
                      >
                        <i className="fa fa-play-circle" />
                      </Flex>
                    </Box>
                  ) : (
                    <Image
                      src={image.s3_url}
                      alt="Attachment"
                      objectFit="cover"
                      width="100%"
                      height="84px"
                      loading="lazy"
                    />
                  )}
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {onStatusChange && (
          <Box>
            <Text fontSize="xs" color="gray.500" mb="4px">
              Change status
            </Text>
            <Select
              size="sm"
              height="40px"
              borderRadius="6px"
              fontSize="sm"
              maxW={{ base: "100%", sm: "240px" }}
              value={ticket.status}
              isDisabled={statusSaving}
              onChange={(event) => onStatusChange(event.target.value)}
            >
              {STATUS_LIST.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.value}
                </option>
              ))}
            </Select>
          </Box>
        )}
      </CustomContainer>

      <CustomContainer title="Checklist" subtleHeader>
        <Checklist
          ticketId={ticket.id}
          items={checklist}
          canEdit={canEdit}
          canTick={canTick}
          onChange={onRefetch}
        />
      </CustomContainer>

      <CustomContainer title="Discussion" subtleHeader noPadding>
        <Tabs colorScheme="purple" size="sm" isLazy>
          <TabList px="16px">
            <Tab fontSize="sm">
              Comments{" "}
              {ticket.comments && ticket.comments.length
                ? `(${ticket.comments.length})`
                : ""}
            </Tab>
            <Tab fontSize="sm">History</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px="16px" pt="16px">
              <CommentThread
                ticketId={ticket.id}
                comments={ticket.comments || []}
                currentEmployeeId={currentEmployeeId}
                canModerate={canModerate}
              />
            </TabPanel>
            <TabPanel px="16px" pt="16px">
              <ActivityLog activity={ticket.activity || []} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CustomContainer>

      <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton color="white" bg="blackAlpha.600" borderRadius="full" />
          <ModalBody p={0}>
            {preview ? (
              isVideoUrl(preview) ? (
                <Box
                  as="video"
                  src={preview}
                  controls
                  autoPlay
                  width="100%"
                  borderRadius="8px"
                  bg="black"
                />
              ) : (
                <Image
                  src={preview}
                  alt="Attachment"
                  width="100%"
                  borderRadius="8px"
                />
              )
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

export default WorkItemDetail;
