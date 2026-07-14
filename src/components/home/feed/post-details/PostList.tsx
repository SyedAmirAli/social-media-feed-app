import { Post } from "@/types";
import PostDetails from "./PostDetails";

export default function PostList({ posts }: { posts: Post[] }) {
    return (
        <div className="w-100">
            {posts.map((post) => (
                <PostDetails key={post.id} post={post} />
            ))}
        </div>
    );
}
