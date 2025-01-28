import React, { useEffect, useState } from "react";
import { getAllPeople, updatePerson } from "../helper/people";

function usePeople() {
  const [peopleList, setPeopleList] = useState([]);

  const init = async () => {
    try {
      const data = await getAllPeople();

      if (data.code === 200) {
        setPeopleList(data.data);
      } else {
        throw data;
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const updatePersonHandler = async (person) => {
    const data = await updatePerson(person.person_id, {
      name: person.name,
      primary_phone: person.primary_phone,
      secondary_phone: person.secondary_phone,
      person_type: person.person_type,
      status: person.status == 1 ? false : true,
    });
    return data;
  };

  return { peopleList, refetch: init, updatePerson: updatePersonHandler };
}

export default usePeople;
