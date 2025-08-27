const { getClient } = require('./database');

async function assignDriverTransaction(driverId, expectedDriverVersion, orderId, expectedOrderVersion) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const resDriver = await client.query(
      `UPDATE drivers
       SET status = 'order_assigned', busy = true, current_order = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE _id = $2 AND (busy = FALSE OR busy IS NULL) AND version = $3`,
      [orderId, driverId, expectedDriverVersion]
    );
    if (resDriver.rowCount !== 1) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'DRIVER_CONFLICT' };
    }

    const resOrder = await client.query(
      `UPDATE orders
       SET driver_id = $1, current_status = 'assigned_driver', version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE _id = $2 AND version = $3`,
      [driverId, orderId, expectedOrderVersion]
    );
    if (resOrder.rowCount !== 1) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'ORDER_CONFLICT' };
    }

    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  assignDriverTransaction
};


