import PayrunHelper from "../helper/payrun";
import { describeApiResult, KIND } from "./salaryApiError";

/**
 * THE MONTHLY PAY TYPE CHANGE, ONCE, FOR EVERY SCREEN THAT OFFERS IT.
 *
 * WHY THIS FILE EXISTS. Pay Type is editable from TWO places in the payrun
 * now - Initialization, where it always was, and Calculation & Review, where
 * whoever is looking at what somebody will actually be paid is the person most
 * likely to notice that it has to go out in cash. The two screens have
 * different state, different refreshes and different lists, but the ACT is one
 * act: one endpoint, one permission, one row in `payrun_employee`, one audit
 * entry. Written twice, the two copies would eventually disagree about what a
 * refusal means or forget to say that the change is month-specific.
 *
 * SO WHAT IS SHARED IS THE CALL AND WHAT TO SAY ABOUT IT, and what is NOT
 * shared is the refresh: each screen reloads its own month, because they read
 * different endpoints.
 *
 * IT DECIDES NO PERMISSION AND NO LOCK. Whether somebody may change a pay
 * type, and whether this employee's month is already approved and locked, are
 * the server's answers - re-checked on every request, and refused there. This
 * module sends the request and translates the outcome.
 *
 * @returns {{ok: boolean, toast: object}} - `toast` is ready to hand straight
 *          to Chakra's `useToast`, in the server's own words when the server
 *          refused.
 */
export async function changeMonthlyPayType({ year, month, employeeId, payType, monthLabel }) {
  const period = monthLabel ? `${monthLabel} ${year}` : `${year}-${String(month).padStart(2, "0")}`;
  try {
    const result = await PayrunHelper.setPayType({
      year,
      month,
      employee_id: employeeId,
      pay_type: payType,
    });
    const outcome = describeApiResult(result);
    if (outcome.kind !== KIND.OK) {
      /*
       * A LOST PERMISSION, A LOCKED MONTH, AN EMPLOYEE APPROVED AND LOCKED
       * SINCE THE SCREEN WAS DRAWN - each said in the server's own words
       * rather than paraphrased, because "that could not be changed" does not
       * tell somebody whether to go and unlock, or to go and ask for a key.
       */
      return {
        ok: false,
        toast: {
          title: outcome.message,
          status: outcome.kind === KIND.DENIED ? "info" : "error",
          duration: 8000,
          isClosable: true,
        },
      };
    }
    return {
      ok: true,
      toast: {
        title: `Pay type set to ${payType} for ${period}.`,
        description:
          "This month only. The employee's record is unchanged, and the calculation will need recalculating.",
        status: "success",
        duration: 5000,
        isClosable: true,
      },
    };
  } catch (err) {
    return {
      ok: false,
      toast: {
        title: "The pay type could not be changed. Please try again.",
        status: "error",
        duration: 6000,
        isClosable: true,
      },
    };
  }
}

export default changeMonthlyPayType;
