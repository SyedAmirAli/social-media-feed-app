/* eslint-disable @next/next/no-img-element */

type NotificationItem = {
    id: string;
    image: string;
    type: "timeline" | "group";
    name?: string;
    groupFrom?: string;
    groupTo?: string;
    time: string;
};

const MOCK_NOTIFICATIONS: NotificationItem[] = Array.from({ length: 18 }, (_, index) => {
    const isTimeline = index % 2 === 0;
    return isTimeline
        ? {
              id: `n-${index}`,
              image: "/assets/images/friend-req.png",
              type: "timeline" as const,
              name: "Steve Jobs",
              time: "42 miniutes ago",
          }
        : {
              id: `n-${index}`,
              image: "/assets/images/profile-1.png",
              type: "group" as const,
              groupFrom: "Freelacer usa",
              groupTo: "Freelacer usa",
              time: "42 miniutes ago",
          };
});

function NotificationBox({ item }: { item: NotificationItem }) {
    return (
        <div className="_notification_box">
            <div className="_notification_image">
                <img src={item.image} alt="Image" className="_notify_img" />
            </div>
            <div className="_notification_txt">
                <p className="_notification_para">
                    {item.type === "timeline" ? (
                        <>
                            <span className="_notify_txt_link">{item.name}</span> posted a link in your timeline.
                        </>
                    ) : (
                        <>
                            An admin changed the name of the group
                            <span className="_notify_txt_link">{item.groupFrom}</span>
                            to
                            <span className="_notify_txt_link">{item.groupTo}</span>
                        </>
                    )}
                </p>
                <div className="_nitification_time">
                    <span>{item.time}</span>
                </div>
            </div>
        </div>
    );
}

export default function NotificationDropdown() {
    return (
        <span id="_notify_btn" className="nav-link _header_nav_link _header_notify_btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" fill="none" viewBox="0 0 20 22">
                <path
                    fill="#000"
                    fillOpacity=".6"
                    fillRule="evenodd"
                    d="M7.547 19.55c.533.59 1.218.915 1.93.915.714 0 1.403-.324 1.938-.916a.777.777 0 011.09-.056c.318.284.344.77.058 1.084-.832.917-1.927 1.423-3.086 1.423h-.002c-1.155-.001-2.248-.506-3.077-1.424a.762.762 0 01.057-1.083.774.774 0 011.092.057zM9.527 0c4.58 0 7.657 3.543 7.657 6.85 0 1.702.436 2.424.899 3.19.457.754.976 1.612.976 3.233-.36 4.14-4.713 4.478-9.531 4.478-4.818 0-9.172-.337-9.528-4.413-.003-1.686.515-2.544.973-3.299l.161-.27c.398-.679.737-1.417.737-2.918C1.871 3.543 4.948 0 9.528 0zm0 1.535c-3.6 0-6.11 2.802-6.11 5.316 0 2.127-.595 3.11-1.12 3.978-.422.697-.755 1.247-.755 2.444.173 1.93 1.455 2.944 7.986 2.944 6.494 0 7.817-1.06 7.988-3.01-.003-1.13-.336-1.681-.757-2.378-.526-.868-1.12-1.851-1.12-3.978 0-2.514-2.51-5.316-6.111-5.316z"
                    clipRule="evenodd"
                />
            </svg>
            <span className="_counting">6</span>
            <div id="_notify_drop" className="_notification_dropdown">
                <div className="_notifications_content">
                    <h4 className="_notifications_content_title">Notifications</h4>
                    <div className="_notification_box_right">
                        <button type="button" className="_notification_box_right_link">
                            <svg xmlns="http://www.w3.org/2000/svg" width="4" height="17" fill="none" viewBox="0 0 4 17">
                                <circle cx="2" cy="2" r="2" fill="#C4C4C4"></circle>
                                <circle cx="2" cy="8" r="2" fill="#C4C4C4"></circle>
                                <circle cx="2" cy="15" r="2" fill="#C4C4C4"></circle>
                            </svg>
                        </button>
                        <div className="_notifications_drop_right">
                            <ul className="_notification_list">
                                <li className="_notification_item">
                                    <span className="_notification_link">Mark as all read</span>
                                </li>
                                <li className="_notification_item">
                                    <span className="_notification_link">Notifivations seetings</span>
                                </li>
                                <li className="_notification_item">
                                    <span className="_notification_link">Open Notifications</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="_notifications_drop_box">
                    <div className="_notifications_drop_btn_grp">
                        <button className="_notifications_btn_link">All</button>
                        <button className="_notifications_btn_link1">Unread</button>
                    </div>
                    <div className="_notifications_all">
                        {MOCK_NOTIFICATIONS.map((item) => (
                            <NotificationBox key={item.id} item={item} />
                        ))}
                    </div>
                </div>
            </div>
        </span>
    );
}
