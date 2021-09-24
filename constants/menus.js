export default {
    dashboard: {
        title: "Dashboard",
        selected: false,
        icon: "fa-columns",
    },
    employee: {
        title: "Employees",
        selected: true,
        openPage: true,
        icon: "fa-users",
        subMenu: {
            view: {
                title: "View Employee",
                selected: false,
                location: "/employee",
            },
            view_departments: {
                title: "View Departments",
                selected: false,
                location: "/department/view",
            },
            view_designation: {
                title: "View Designations",
                selected: false,
                location: "/designation/view",
            },
            view_shift: {
                title: "View Shift",
                selected: false,
                location: "/shift/view",
            },
            view_family: {
                title: "View Family",
                selected: false,
                location: "/family/view",
            },
            view_adhaar: {
                title: "View Adhaar",
                selected: false,
                location: "/adhaar/view",
            },
            view_bank: {
                title: "Users Without Bank Details",
                selected: false,
                location: "/bank/view",
            },
            view_documents: {
                title: "View documents",
                selected: false,
                location: "/document/view",
            },
        },
    },
}