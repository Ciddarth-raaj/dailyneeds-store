import React, { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Flex,
  IconButton,
  Text,
  Textarea,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import { addTicketComment, deleteTicketComment } from "../../helper/tickets";
import { formatRelative } from "../../constants/workItems";

/**
 * The conversation on a work item. Posting here also lands in the outlet and
 * department Telegram chats, so the discussion stays in one place instead of
 * scattering across group chats.
 */
function CommentThread({ ticketId, comments = [], currentEmployeeId, canModerate }) {
  const [rows, setRows] = useState(comments);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  React.useEffect(() => {
    setRows(comments);
  }, [comments]);

  const handlePost = async () => {
    const comment = draft.trim();
    if (!comment) return;

    setPosting(true);
    try {
      const updated = await addTicketComment(ticketId, comment);
      if (Array.isArray(updated)) {
        setRows(updated);
        setDraft("");
      } else {
        throw updated;
      }
    } catch (err) {
      toast.error("Could not post your comment");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (comment) => {
    try {
      const updated = await deleteTicketComment(comment.comment_id);
      if (Array.isArray(updated)) {
        setRows(updated);
      } else {
        throw updated;
      }
    } catch (err) {
      toast.error("Could not delete that comment");
    }
  };

  return (
    <Box>
      <Flex direction="column" gap="14px" mb="16px">
        {rows.length === 0 ? (
          <Text fontSize="sm" color="gray.400">
            No comments yet. Ask a question or leave an update.
          </Text>
        ) : (
          rows.map((comment) => {
            const isMine =
              String(comment.employee_id) === String(currentEmployeeId);

            return (
              <Flex key={comment.comment_id} gap="10px" align="flex-start">
                <Avatar
                  size="sm"
                  name={comment.employee_name || "Unknown"}
                  src={comment.employee_image || undefined}
                />
                <Box
                  flex="1"
                  minW={0}
                  bg={isMine ? "purple.50" : "gray.50"}
                  borderRadius="8px"
                  p="10px 12px"
                >
                  <Flex justify="space-between" align="baseline" gap="8px">
                    <Text fontSize="xs" fontWeight="600" color="gray.700">
                      {comment.employee_name || "Unknown"}
                    </Text>
                    <Flex align="center" gap="4px">
                      <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">
                        {formatRelative(comment.created_at)}
                      </Text>
                      {(isMine || canModerate) && (
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Delete comment"
                          icon={<i className="fa fa-times" />}
                          onClick={() => handleDelete(comment)}
                        />
                      )}
                    </Flex>
                  </Flex>
                  <Text
                    fontSize="sm"
                    color="gray.800"
                    mt="2px"
                    whiteSpace="pre-wrap"
                  >
                    {comment.comment}
                  </Text>
                </Box>
              </Flex>
            );
          })
        )}
      </Flex>

      <Textarea
        size="sm"
        borderRadius="6px"
        fontSize="sm"
        rows={3}
        placeholder="Write a comment..."
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <Flex justify="flex-end" mt="8px">
        <Button
          size="sm"
          colorScheme="purple"
          isLoading={posting}
          isDisabled={!draft.trim()}
          onClick={handlePost}
        >
          Comment
        </Button>
      </Flex>
    </Box>
  );
}

export default CommentThread;
