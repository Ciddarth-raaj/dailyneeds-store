export const BOOLEAN_LIST = [
    {
        value: 1,
        label: "Yes",
    },
    {
        value: 0,
        label: "No",
    }
]

export const PACKAGING_TYPE_LIST = [
    {
        value: 1,
        label: "Hand",
    },
    {
        value: 2,
        label: "Machine",
    },
    {
        value: 3,
        label: "Bulk",
    }
]

export const PACKAGING_MATERIAL_SIZE_LIST = [
    {
        value: 1,
        label: "1 ",
    },
    {
        value: 2,
        label: "2",
    },
    {
        value: 3,
        label: "10*12",
    },
    {
        value: 4,
        label: "10*14",
    },
    {
        value: 5,
        label: "10*16",
    },
    {
        value: 6,
        label: "100G",
    },
    {
        value: 7,
        label: "12*18",
    },
    {
        value: 8,
        label: "200MM",
    },
    {
        value: 9,
        label: "220MM",
    },
    {
        value: 10,
        label: "250G",
    },
    {
        value: 11,
        label: "280MM",
    },
    {
        value: 12,
        label: "3.5*4.5",
    },
    {
        value: 13,
        label: "330MM",
    },
    {
        value: 14,
        label: "380MM",
    },
    {
        value: 15,
        label: "4*6",
    },
    {
        value: 16,
        label: "5*7",
    },
    {
        value: 17,
        label: "500G",
    },
    {
        value: 18,
        label: "50g",
    },
    {
        value: 19,
        label: "6*9",
    },
    {
        value: 20,
        label: "7*10",
    },
    {
        value: 21,
        label: "8*12",
    },
    {
        value: 22,
        label: "8*10",
    },
]

export const PACKAGING_MATERIAL_LIST = [
    {
        value: 1,
        label: "Box"
    },
    {
        value: 2,
        label: "PP"
    },
    {
        value: 3,
        label: "LD"
    },
    {
        value: 4,
        label: "Standup Pouch"
    },
    {
        value: 5,
        label: "PP Woven"
    },
    {
        value: 6,
        label: "Laminated Rolls"
    },
    {
        value: 7,
        label: "Laminated Pouch"
    },
]

export const findItem = (list, value) => {
    if(!list || value === undefined || value ===  null) {
        return "-"
    }

    const item = list.find(item => item.value == value)

    if(!item) {
        return "-"
    }

    return item.label
}