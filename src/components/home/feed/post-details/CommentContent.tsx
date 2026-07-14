import { Fragment } from "react";
import type { Comment } from "@/types";
import { authorLabel } from "./reaction-utils";

type CommentContentProps = {
    content: string;
    repliedTo?: Comment["repliedTo"];
};

export default function CommentContent({ content, repliedTo }: CommentContentProps) {
    const mentionName = repliedTo ? authorLabel(repliedTo) : "";
    const mentionTag = mentionName ? `@${mentionName}` : "";

    if (mentionTag && content.startsWith(mentionTag)) {
        return (
            <Fragment>
                <span className="_comment_mention">{mentionTag}</span>
                {content.slice(mentionTag.length)}
            </Fragment>
        );
    }

    return <Fragment>{content}</Fragment>;
}
